import { useState, useEffect, lazy, Suspense, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useOnboarding } from "@/hooks/useOnboarding";
import { TutorialDialog } from "@/components/onboarding/TutorialDialog";
import { AppointmentDialog } from "@/components/dialogs/AppointmentDialog";
import { MigrationDialog } from "@/components/dialogs/MigrationDialog";
import { DashboardWidget } from "@/components/dashboard/DashboardWidget";
import { OptimizedQuickActionsWidget } from "@/components/dashboard/OptimizedQuickActionsWidget";
import { UpcomingAppointmentsWidget } from "@/components/dashboard/UpcomingAppointmentsWidget";
import { RemindersWidget } from "@/components/dashboard/RemindersWidget";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Edit3, Check, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, FileText, DollarSign } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { handleError } from "@/utils/errorTracking";
import type { Database } from "@/integrations/supabase/types";

// Lazy load heavy widgets for better performance
const ChartsWidget = lazy(() => import("@/components/dashboard/ChartsWidget").then(m => ({ default: m.ChartsWidget })));
const RecentNotesWidget = lazy(() => import("@/components/dashboard/RecentNotesWidget").then(m => ({ default: m.RecentNotesWidget })));
const ProgressPathWidget = lazy(() => import("@/components/dashboard/ProgressPathWidget").then(m => ({ default: m.ProgressPathWidget })));

type Reminder = Database["public"]["Tables"]["reminders"]["Row"];
type Appointment = Database["public"]["Tables"]["appointments"]["Row"] & {
  clients: {
    first_name: string;
    last_name: string;
  } | null;
};

function SortableWidget({ id, children, isEditMode, onRemove }: { id: string; children: React.ReactNode; isEditMode: boolean; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DashboardWidget id={id} isEditMode={isEditMode} onRemove={onRemove}>
        {children}
      </DashboardWidget>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { subscribed, trialDaysLeft, loading: subscriptionLoading } = useSubscription();
  const { showTutorial, setShowTutorial, loading: onboardingLoading } = useOnboarding();
  const [stats, setStats] = useState({ clients: 0, todayAppointments: 0, notes: 0, pendingInvoices: 0 });

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [migrationDialogOpen, setMigrationDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const { toast } = useToast();
  const { settings, updateSettings } = useUserSettings();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 1000, // 1 second hold required for drag (prevents accidental drags)
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchDashboardData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];
      const now = new Date().toISOString();

      const [clientsRes, todayAppointmentsRes, notesRes, invoicesRes, remindersRes, upcomingAppointmentsRes] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact" }).eq("therapist_id", user.id),
        supabase.from("appointments").select("id", { count: "exact" }).eq("therapist_id", user.id).gte("appointment_date", today).lt("appointment_date", `${today}T23:59:59`),
        supabase.from("soap_notes").select("id", { count: "exact" }).eq("therapist_id", user.id),
        supabase.from("invoices").select("id", { count: "exact" }).eq("therapist_id", user.id).eq("status", "pending"),
        supabase.from("reminders").select("*").eq("therapist_id", user.id).eq("completed", false).order("reminder_date", { ascending: true }).limit(5),
        supabase.from("appointments").select(`id, appointment_date, duration_minutes, status, clients!appointments_client_id_fkey (first_name, last_name)`).eq("therapist_id", user.id).gte("appointment_date", now).order("appointment_date", { ascending: true }).limit(5)
      ]);

      setStats({
        clients: clientsRes.count || 0,
        todayAppointments: todayAppointmentsRes.count || 0,
        notes: notesRes.count || 0,
        pendingInvoices: invoicesRes.count || 0,
      });

      setReminders(remindersRes.data || []);
      setUpcomingAppointments(upcomingAppointmentsRes.data || []);
      setLoading(false);
    } catch (error) {
      // Only notify if nothing was loaded
      setLoading(false);
      toast({ title: "Error loading dashboard", description: "Please try refreshing the page", variant: "destructive" });
    }
  }, [toast]);

  const checkMigrationStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const hasSeenMigration = localStorage.getItem(`migration_dismissed_${user.id}`);
      if (!hasSeenMigration && subscribed) {
        setMigrationDialogOpen(true);
      }
    } catch (error) {
      // Silent fail for migration check
    }
  };

  const handleMigrationDismiss = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        localStorage.setItem(`migration_dismissed_${user.id}`, 'true');
      }
    } catch (error) {
      // Silent fail for migration dismiss
    }
  };

  const handleMigrationSkip = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Log skip action
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'MIGRATION_SKIPPED_FROM_DASHBOARD',
        entity_type: 'migration_assistant',
        entity_id: null,
        success: true,
      });

      // Create notification to show in bell
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Migration Assistant Available',
        message: 'The AI Migration Assistant is ready to help you transfer data from your previous platform whenever you\'re ready.',
        type: 'migration',
        link: '/assistant?migration=true'
      });

      localStorage.setItem(`migration_dismissed_${user.id}`, 'true');
      toast({
        title: "Migration Assistant",
        description: "A reminder has been added to your notifications",
      });
    } catch (error) {
      await handleError(error, '/dashboard', toast);
    }
    setMigrationDialogOpen(false);
  };

  useEffect(() => {
    fetchDashboardData();
    checkMigrationStatus();
    
    const interval = setInterval(fetchDashboardData, 30000);

    const appointmentsChannel = supabase
      .channel('dashboard-appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchDashboardData)
      .subscribe();

    const remindersChannel = supabase
      .channel('dashboard-reminders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' }, fetchDashboardData)
      .subscribe();

    const clientsChannel = supabase
      .channel('dashboard-clients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, fetchDashboardData)
      .subscribe();

    const invoicesChannel = supabase
      .channel('dashboard-invoices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, fetchDashboardData)
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(remindersChannel);
      supabase.removeChannel(clientsChannel);
      supabase.removeChannel(invoicesChannel);
    };
  }, [fetchDashboardData]);

  const markReminderComplete = async (reminderId: string) => {
    if (!reminderId) {
      // Empty string means just refresh (from create dialog)
      fetchDashboardData();
      return;
    }

    try {
      // Get reminder data before updating
      const reminderToComplete = reminders.find(r => r.id === reminderId);
      
      // Optimistically update local state immediately
      setReminders(prev => prev.filter(r => r.id !== reminderId));
      
      const { error } = await supabase.from("reminders").update({ completed: true }).eq("id", reminderId);
      if (error) throw error;
      
      // Show toast with undo option
      toast({ 
        title: "Reminder completed",
        description: reminderToComplete?.title,
        action: (
          <Button 
            variant="outline" 
            size="sm"
            onClick={async () => {
              const { error: undoError } = await supabase
                .from("reminders")
                .update({ completed: false })
                .eq("id", reminderId);
              
              if (!undoError) {
                toast({ title: "Reminder restored" });
                // Add back to list
                if (reminderToComplete) {
                  setReminders(prev => [...prev, reminderToComplete].sort((a, b) => 
                    new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime()
                  ));
                }
              }
            }}
          >
            Undo
          </Button>
        ),
      });
    } catch (error) {
      toast({ title: "Error completing reminder", variant: "destructive" });
      // Revert optimistic update on error
      fetchDashboardData();
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = settings.dashboard_widgets_order.indexOf(active.id as string);
    const newIndex = settings.dashboard_widgets_order.indexOf(over.id as string);

    const newOrder = arrayMove(settings.dashboard_widgets_order, oldIndex, newIndex);
    updateSettings({ dashboard_widgets_order: newOrder });
  };

  const removeWidget = (widgetId: string) => {
    const newVisible = { ...settings.dashboard_widgets_visible, [widgetId]: false };
    updateSettings({ dashboard_widgets_visible: newVisible });
    toast({ 
      title: "Widget removed", 
      description: "You can re-enable it in Settings",
      duration: 3000 
    });
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (!isEditMode) {
      toast({ title: "Edit mode", description: "Drag widgets to reorder or click X to remove" });
    }
  };

  const widgetComponents: Record<string, React.ReactNode> = {
    quick_actions: <OptimizedQuickActionsWidget onScheduleAppointment={() => setAppointmentDialogOpen(true)} />,
    appointments: <UpcomingAppointmentsWidget appointments={upcomingAppointments} loading={loading} onScheduleNew={() => setAppointmentDialogOpen(true)} />,
    reminders: <RemindersWidget reminders={reminders} loading={loading} onMarkComplete={markReminderComplete} />,
    charts: (
      <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading charts...</div>}>
        <ChartsWidget />
      </Suspense>
    ),
    recent_notes: (
      <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading notes...</div>}>
        <RecentNotesWidget />
      </Suspense>
    ),
    progress_path: (
      <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading progress paths...</div>}>
        <ProgressPathWidget />
      </Suspense>
    ),
  };

  const visibleWidgets = settings.dashboard_widgets_order.filter(id => settings.dashboard_widgets_visible[id]);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your practice overview</p>
        </div>
        <Button onClick={toggleEditMode} variant={isEditMode ? "default" : "outline"}>
          {isEditMode ? <><Check className="w-4 h-4 mr-2" /> Done</> : <><Edit3 className="w-4 h-4 mr-2" /> Edit Dashboard</>}
        </Button>
      </div>

      {/* Trial Banner */}
      {!subscriptionLoading && subscribed && trialDaysLeft !== null && trialDaysLeft > 0 && (
        <Alert className="mb-6 border-primary/50 bg-primary/10">
          <Clock className="h-4 w-4 text-primary" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              <strong>{trialDaysLeft} days</strong> left in your free trial. 
              {trialDaysLeft <= 3 && " Don't lose access to your features!"}
            </span>
            <Button variant="outline" size="sm" onClick={() => navigate("/settings")}>
              Manage Subscription
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="cursor-pointer card-hover animate-fade-in" onClick={() => navigate("/clients")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clients}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.clients === 0 ? "No clients yet" : "Active clients"}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer card-hover animate-fade-in" style={{ animationDelay: '0.1s' }} onClick={() => navigate("/appointments")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <div className="p-2 bg-accent/10 rounded-lg">
              <Calendar className="w-4 h-4 text-accent-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayAppointments}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.todayAppointments === 0 ? "No appointments" : "Scheduled today"}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer card-hover animate-fade-in" style={{ animationDelay: '0.2s' }} onClick={() => navigate("/notes")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">SOAP Notes</CardTitle>
            <div className="p-2 bg-secondary/50 rounded-lg">
              <FileText className="w-4 h-4 text-secondary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.notes}</div>
            <p className="text-xs text-muted-foreground mt-1">Total notes</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer card-hover animate-fade-in" style={{ animationDelay: '0.3s' }} onClick={() => navigate("/billing")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingInvoices}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.pendingInvoices === 0 ? "All caught up" : "Need attention"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Draggable Widgets */}
      {visibleWidgets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No widgets visible. Enable them in Settings.</p>
            <Button onClick={() => navigate("/settings")}>Go to Settings</Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleWidgets} strategy={verticalListSortingStrategy}>
            <div className="space-y-6">
              {visibleWidgets.map((widgetId: string) => (
                <SortableWidget key={widgetId} id={widgetId} isEditMode={isEditMode} onRemove={() => removeWidget(widgetId)}>
                  {widgetComponents[widgetId]}
                </SortableWidget>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <AppointmentDialog 
        open={appointmentDialogOpen}
        onOpenChange={setAppointmentDialogOpen}
        onSuccess={fetchDashboardData}
      />

      <MigrationDialog
        open={migrationDialogOpen}
        onOpenChange={setMigrationDialogOpen}
        onDismiss={handleMigrationDismiss}
        onSkip={handleMigrationSkip}
      />

      <TutorialDialog
        open={showTutorial && !onboardingLoading}
        onOpenChange={setShowTutorial}
        onComplete={() => setShowTutorial(false)}
        onDismiss={() => setShowTutorial(false)}
      />
    </div>
  );
}

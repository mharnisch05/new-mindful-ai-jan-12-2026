import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, FileText, MessageSquare, Settings, DollarSign, User, Brain, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { handleError } from "@/utils/errorTracking";
import type { Database } from "@/integrations/supabase/types";
import { ClientMessaging } from "@/components/client/ClientMessaging";
import { ClientDocuments } from "@/components/client/ClientDocuments";
import { ClientAppointments } from "@/components/client/ClientAppointments";
import { ClientBilling } from "@/components/client/ClientBilling";
import { ProgressPathView } from "@/components/progress/ProgressPathView";
import { InspirationalQuote } from "@/components/client/InspirationalQuote";
import { ProgressPathGuidanceDialog } from "@/components/dialogs/ProgressPathGuidanceDialog";
import { DemoBanner } from "@/components/DemoBanner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationDropdown } from "@/components/NotificationDropdown";

export default function ClientPortal() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<{
    clients: Database["public"]["Tables"]["clients"]["Row"];
  } | null>(null);
  const [therapistData, setTherapistData] = useState<Database["public"]["Tables"]["profiles"]["Row"] | null>(null);

  useEffect(() => {
    loadClientData();
    handlePaymentSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePaymentSuccess = async () => {
    const paymentStatus = searchParams.get('payment');
    const invoiceId = searchParams.get('invoice_id');

    if (paymentStatus === 'success' && invoiceId) {
      try {
        // Update invoice status to paid
        const { error } = await supabase
          .from('invoices')
          .update({ 
            status: 'paid',
            paid_date: new Date().toISOString().split('T')[0]
          })
          .eq('id', invoiceId);

        if (error) throw error;

        toast({
          title: "Payment successful!",
          description: "Your invoice has been paid",
        });

        // Clear URL params
        window.history.replaceState({}, '', '/client-portal');
      } catch (error) {
        await handleError(error, '/client-portal', toast);
      }
    } else if (paymentStatus === 'canceled') {
      toast({
        title: "Payment canceled",
        description: "Your payment was not processed",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/client-portal');
    }
  };

  const loadClientData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user has admin override
      const { data: adminOverride } = await supabase
        .from("admin_overrides")
        .select("*")
        .eq("user_email", user.email)
        .single();

      if (adminOverride && adminOverride.grant_client_portal) {
        // Admin with client portal access - show demo data
        setClientData({
          clients: {
            id: "demo",
            first_name: "Admin",
            last_name: "User",
            email: user.email,
            therapist_id: "demo"
          }
        });
        setTherapistData({
          full_name: "Demo Therapist",
          specialty: "General Practice",
          email: "demo@example.com"
        });
        setLoading(false);
        return;
      }

      // Get client record
      const { data: clientUser, error: clientUserError } = await supabase
        .from("client_users")
        .select("*, clients(*)")
        .eq("user_id", user.id)
        .single();

      if (clientUserError) {
        toast({ 
          title: "Access Denied", 
          description: "You don't have access to the client portal.",
          variant: "destructive" 
        });
        navigate("/dashboard");
        return;
      }

      setClientData(clientUser);

      // Get therapist profile
      const { data: therapist, error: therapistError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", clientUser.clients.therapist_id)
        .single();

      if (therapistError) {
        // Silent fail for therapist data - not critical
      } else {
        setTherapistData(therapist);
      }

    } catch (error) {
      await handleError(error, '/client-portal', toast);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      // Clear all session data
      localStorage.clear();
      sessionStorage.clear();
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({ title: "Signed out successfully" });
      navigate("/auth");
    } catch (error) {
      await handleError(error, '/client-portal', toast);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading portal...</p>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Unable to load portal</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DemoBanner />
      <ProgressPathGuidanceDialog 
        userType="client" 
        onDismiss={() => {}} 
      />
      
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">Mindful AI</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationDropdown />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(clientData.clients.first_name, clientData.clients.last_name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="font-medium">
                  {clientData.clients.first_name} {clientData.clients.last_name}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/client-settings")}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <User className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Therapist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium text-lg">
                {therapistData?.full_name?.startsWith("Dr.") || therapistData?.full_name?.startsWith("Dr ") 
                  ? therapistData.full_name 
                  : `Dr. ${therapistData?.full_name}`}
              </p>
              {therapistData?.specialty && (
                <p className="text-sm text-muted-foreground">{therapistData.specialty}</p>
              )}
              <div className="pt-2 space-y-1">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Email:</span> {therapistData?.email}
                </p>
                {therapistData?.phone && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Phone:</span> {therapistData.phone}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <InspirationalQuote />
        </div>

        <Tabs defaultValue="appointments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 h-auto">
            <TabsTrigger value="appointments" className="flex-col sm:flex-row gap-1 py-2">
              <Calendar className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Appointments</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex-col sm:flex-row gap-1 py-2">
              <Target className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Progress</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex-col sm:flex-row gap-1 py-2">
              <MessageSquare className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Messages</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex-col sm:flex-row gap-1 py-2">
              <FileText className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Documents</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex-col sm:flex-row gap-1 py-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Billing</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments">
            <ClientAppointments clientId={clientData.clients.id} therapistId={clientData.clients.therapist_id} />
          </TabsContent>

          <TabsContent value="progress">
            <ProgressPathView 
              clientId={clientData.clients.id} 
              clientName={`${clientData.clients.first_name} ${clientData.clients.last_name}`}
            />
          </TabsContent>

          <TabsContent value="messages">
            <ClientMessaging clientId={clientData.clients.id} therapistId={clientData.clients.therapist_id} />
          </TabsContent>

          <TabsContent value="documents">
            <ClientDocuments clientId={clientData.clients.id} therapistId={clientData.clients.therapist_id} isTherapist={false} />
          </TabsContent>

          <TabsContent value="billing">
            <ClientBilling clientId={clientData.clients.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar, Clock } from "lucide-react";

interface RecurringGroupViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentAppointmentId: string;
  onSuccess: () => void;
}

export function RecurringGroupViewDialog({ 
  open, 
  onOpenChange, 
  parentAppointmentId, 
  onSuccess 
}: RecurringGroupViewDialogProps) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    start_time: "",
    duration_minutes: "60",
    notes: "",
    end_date: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open && parentAppointmentId) {
      fetchRecurringGroup();
    }
  }, [open, parentAppointmentId]);

  const fetchRecurringGroup = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          clients!appointments_client_id_fkey (first_name, last_name)
        `)
        .or(`id.eq.${parentAppointmentId},parent_appointment_id.eq.${parentAppointmentId}`)
        .order("appointment_date", { ascending: true });

      if (error) throw error;

      setAppointments(data || []);
      
      // Set initial form data from parent appointment
      const parent = data?.find(apt => apt.id === parentAppointmentId);
      if (parent) {
        const date = new Date(parent.appointment_date);
        setFormData({
          start_time: format(date, "HH:mm"),
          duration_minutes: parent.duration_minutes?.toString() || "60",
          notes: parent.notes || "",
          end_date: parent.recurrence_end_date || "",
        });
      }
    } catch (error) {
      console.error("Error fetching recurring group:", error);
      toast({
        title: "Error loading appointments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditGroup = async () => {
    if (!editMode) {
      setEditMode(true);
      return;
    }

    setLoading(true);
    try {
      // Update all appointments in the group
      const updates = appointments.map(apt => {
        const date = new Date(apt.appointment_date);
        const [hours, minutes] = formData.start_time.split(':');
        date.setHours(parseInt(hours), parseInt(minutes));

        return {
          id: apt.id,
          appointment_date: date.toISOString(),
          duration_minutes: parseInt(formData.duration_minutes),
          notes: formData.notes,
        };
      });

      for (const update of updates) {
        const { error } = await supabase
          .from("appointments")
          .update({
            appointment_date: update.appointment_date,
            duration_minutes: update.duration_minutes,
            notes: update.notes,
          })
          .eq("id", update.id);

        if (error) throw error;
      }

      toast({
        title: "Recurring appointments updated",
        description: `Updated ${updates.length} appointments`
      });

      setEditMode(false);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating recurring group:", error);
      toast({
        title: "Error updating appointments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirm(`Delete all ${appointments.length} appointments in this recurring series?`)) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .delete()
        .or(`id.eq.${parentAppointmentId},parent_appointment_id.eq.${parentAppointmentId}`);

      if (error) throw error;

      toast({
        title: "Recurring appointments deleted",
        description: `Deleted ${appointments.length} appointments`
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting recurring group:", error);
      toast({
        title: "Error deleting appointments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recurring Appointment Series</DialogTitle>
          <DialogDescription>
            {appointments.length} appointments in this series
          </DialogDescription>
        </DialogHeader>

        {editMode ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="time">Time (applies to all)</Label>
              <Input
                id="time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (applies to all)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
            {appointments.map((apt) => (
              <div key={apt.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(apt.appointment_date), "EEEE, MMM d, yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(apt.appointment_date), "h:mm a")} ({apt.duration_minutes}min)
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground capitalize">{apt.status}</span>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="flex gap-2">
          <Button variant="destructive" onClick={handleDeleteGroup} disabled={loading}>
            Delete Series
          </Button>
          {editMode && (
            <Button variant="outline" onClick={() => setEditMode(false)}>
              Cancel
            </Button>
          )}
          <Button onClick={handleEditGroup} disabled={loading}>
            {editMode ? "Save Changes" : "Edit Series"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { ClientSearchSelect } from "./ClientSearchSelect";
import { Textarea } from "@/components/ui/textarea";

const appointmentSchema = z.object({
  client_id: z.string().uuid("Please select a client"),
  appointment_date: z.string().min(1, "Date is required"),
  appointment_time: z.string().min(1, "Time is required"),
  duration_minutes: z.string().refine((val) => !isNaN(parseInt(val)) && parseInt(val) > 0, "Duration must be greater than 0"),
});

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  appointment?: any;
}

export function AppointmentDialog({ open, onOpenChange, onSuccess, appointment }: AppointmentDialogProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    client_id: "",
    appointment_date: "",
    appointment_time: "",
    duration_minutes: "60",
    notes: "",
  });
  const { toast } = useToast();
  const isEditing = !!appointment;

  useEffect(() => {
    if (open) {
      fetchClients();
      if (appointment) {
        const dateTime = new Date(appointment.appointment_date);
        setFormData({
          client_id: appointment.client_id,
          appointment_date: dateTime.toISOString().split('T')[0],
          appointment_time: dateTime.toTimeString().slice(0, 5),
          duration_minutes: appointment.duration_minutes.toString(),
          notes: appointment.notes || "",
        });
      } else {
        setFormData({ client_id: "", appointment_date: "", appointment_time: "", duration_minutes: "60", notes: "" });
      }
    }
  }, [open, appointment]);

  const fetchClients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("clients")
      .select("id, first_name, last_name")
      .eq("therapist_id", user.id);
    
    setClients(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const validation = appointmentSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({ title: firstError.message, variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Persist as ISO (UTC) so we can always render correctly in local time
    const appointmentDateTime = new Date(`${validation.data.appointment_date}T${validation.data.appointment_time}`).toISOString();

    let error;
    let createdAppointmentId;
    if (isEditing) {
      const result = await supabase.from("appointments").update({
        client_id: validation.data.client_id,
        appointment_date: appointmentDateTime,
        duration_minutes: parseInt(validation.data.duration_minutes),
        notes: formData.notes || null,
      }).eq("id", appointment.id);
      error = result.error;
    } else {
      const result = await supabase.from("appointments").insert({
        client_id: validation.data.client_id,
        therapist_id: user.id,
        appointment_date: appointmentDateTime,
        duration_minutes: parseInt(validation.data.duration_minutes),
        notes: formData.notes || null,
      }).select();
      error = result.error;
      createdAppointmentId = result.data?.[0]?.id;
    }

    if (error) {
      console.error("Appointment error:", error);
      toast({ 
        title: `Error ${isEditing ? 'updating' : 'creating'} appointment`,
        description: error.message || "Please check your input and try again.",
        variant: "destructive" 
      });
      return;
    } else {
      // Create Zoom meeting for the appointment
      const appointmentId = isEditing ? appointment.id : createdAppointmentId;
      
      // Get client details for Zoom meeting
      const { data: clientData } = await supabase
        .from("clients")
        .select("first_name, last_name, email")
        .eq("id", validation.data.client_id)
        .single();

      if (appointmentId && clientData) {
        const clientName = `${clientData.first_name} ${clientData.last_name}`;
        
        // Create Zoom meeting via edge function
        const { error: zoomError } = await supabase.functions.invoke("create-zoom-meeting", {
          body: {
            appointmentId,
            topic: `Therapy Session with ${clientName}`,
            startTime: appointmentDateTime,
            duration: parseInt(validation.data.duration_minutes),
            clientName,
            clientEmail: clientData.email,
          }
        });

        if (zoomError) {
          console.error('Zoom meeting creation error:', zoomError);
          // Don't fail the appointment creation if Zoom fails
          toast({
            title: "Appointment created, but Zoom link failed",
            description: "You can add a Zoom link manually or reconnect Zoom in Settings.",
            variant: "destructive",
          });
        }
      }

      // Send notification via edge function
      const { data: clientUser } = await supabase
        .from("client_users")
        .select("user_id")
        .eq("client_id", validation.data.client_id)
        .maybeSingle();

      if (clientUser) {
        const appointmentDate = new Date(appointmentDateTime).toLocaleString();
        await supabase.functions.invoke("send-notification", {
          body: {
            userId: clientUser.user_id,
            title: `Appointment ${isEditing ? 'Updated' : 'Scheduled'}`,
            message: `Your appointment has been ${isEditing ? 'updated' : 'scheduled'} for ${appointmentDate}`,
            link: "/client-portal",
          }
        });
      }

      toast({ title: `Appointment ${isEditing ? 'updated' : 'scheduled'} successfully` });
      onOpenChange(false);
      setFormData({ client_id: "", appointment_date: "", appointment_time: "", duration_minutes: "60", notes: "" });
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Appointment' : 'Schedule Appointment'}</DialogTitle>
          <DialogDescription>{isEditing ? 'Update appointment details' : 'Book a session with a client'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              {isEditing ? (
                <Input
                  value={`${clients.find(c => c.id === formData.client_id)?.first_name || ''} ${clients.find(c => c.id === formData.client_id)?.last_name || ''}`.trim() || 'Loading...'}
                  disabled
                  className="bg-muted"
                />
              ) : (
                <ClientSearchSelect
                  clients={clients}
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  placeholder="Select a client"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.appointment_date}
                onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={formData.appointment_time}
                onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Select value={formData.duration_minutes} onValueChange={(value) => setFormData({ ...formData, duration_minutes: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add appointment notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="submit">{isEditing ? 'Save Changes' : 'Schedule'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
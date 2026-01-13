import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ClientSearchSelect } from "./ClientSearchSelect";
import { addDays, addWeeks, addMonths, format } from "date-fns";

interface RecurringAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RecurringAppointmentDialog({ open, onOpenChange, onSuccess }: RecurringAppointmentDialogProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    client_id: "",
    start_date: "",
    start_time: "09:00",
    duration_minutes: "60",
    frequency: "weekly",
    interval: "1",
    occurrences: "10",
    end_date: "",
    notes: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchClients();
    }
  }, [open]);

  const fetchClients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("clients")
      .select("id, first_name, last_name")
      .eq("therapist_id", user.id);
    
    setClients(data || []);
  };

  const generateRecurringAppointments = async () => {
    const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`);
    const appointments = [];
    let currentDate = startDateTime;
    const maxOccurrences = parseInt(formData.occurrences);
    const interval = parseInt(formData.interval);

    for (let i = 0; i < maxOccurrences; i++) {
      if (formData.end_date && currentDate > new Date(formData.end_date)) {
        break;
      }

      appointments.push({
        appointment_date: currentDate.toISOString(),
        duration_minutes: parseInt(formData.duration_minutes),
        notes: formData.notes,
      });

      // Calculate next occurrence
      if (formData.frequency === "daily") {
        currentDate = addDays(currentDate, interval);
      } else if (formData.frequency === "weekly") {
        currentDate = addWeeks(currentDate, interval);
      } else if (formData.frequency === "biweekly") {
        currentDate = addWeeks(currentDate, 2 * interval);
      } else if (formData.frequency === "monthly") {
        currentDate = addMonths(currentDate, interval);
      }
    }

    return appointments;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.start_date) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const appointments = await generateRecurringAppointments();
      
      // Create parent appointment
      const { data: parentApt, error: parentError } = await supabase
        .from("appointments")
        .insert({
          therapist_id: user.id,
          client_id: formData.client_id,
          appointment_date: appointments[0].appointment_date,
          duration_minutes: appointments[0].duration_minutes,
          notes: formData.notes,
          status: "scheduled",
          recurrence_rule: `FREQ=${formData.frequency.toUpperCase()};INTERVAL=${formData.interval}`,
          recurrence_end_date: formData.end_date || null,
        })
        .select()
        .single();

      if (parentError) throw parentError;

      // Create child appointments
      const childAppointments = appointments.slice(1).map(apt => ({
        therapist_id: user.id,
        client_id: formData.client_id,
        parent_appointment_id: parentApt.id,
        appointment_date: apt.appointment_date,
        duration_minutes: apt.duration_minutes,
        notes: apt.notes,
        status: "scheduled",
      }));

      if (childAppointments.length > 0) {
        const { error: childError } = await supabase
          .from("appointments")
          .insert(childAppointments);

        if (childError) throw childError;
      }

      toast({ title: `Created ${appointments.length} recurring appointments` });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({ 
        title: "Error creating recurring appointments",
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Recurring Appointments</DialogTitle>
          <DialogDescription>Set up a series of repeating appointments</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <ClientSearchSelect
                clients={clients}
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                placeholder="Select a client"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                />
              </div>
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
                  <SelectItem value="120">120 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="occurrences">Number of Occurrences</Label>
                <Input
                  id="occurrences"
                  type="number"
                  min="1"
                  max="52"
                  value={formData.occurrences}
                  onChange={(e) => setFormData({ ...formData, occurrences: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Or End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                placeholder="Recurring therapy session..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="submit">Create Recurring Appointments</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

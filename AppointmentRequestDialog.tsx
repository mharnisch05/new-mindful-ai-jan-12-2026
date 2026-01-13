import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface AppointmentRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  therapistId: string;
}

export function AppointmentRequestDialog({ open, onOpenChange, clientId, therapistId }: AppointmentRequestDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [duration, setDuration] = useState("60");
  const [notes, setNotes] = useState("");
  const [availability, setAvailability] = useState<any>(null);
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setAvailabilityLoaded(false);
      fetchAvailability();
    }
  }, [open, duration]); // Re-fetch when duration changes to update availability

  const fetchAvailability = async () => {
    try {
      // Fetch therapist's calendar preferences and existing appointments
      const { data: prefs, error: prefsError } = await supabase
        .from("calendar_preferences")
        .select("*")
        .eq("therapist_id", therapistId)
        .single();

      if (prefsError) {
        console.error("Error loading calendar preferences:", prefsError);
        setAvailability(null);
        return;
      }

      const { data: appointments, error: apptError } = await supabase
        .from("appointments")
        .select("appointment_date, duration_minutes")
        .eq("therapist_id", therapistId)
        .gte("appointment_date", new Date().toISOString());

      if (apptError) {
        console.error("Error loading appointments:", apptError);
      }

      setAvailability({ prefs, appointments: appointments || [] });
    } finally {
      setAvailabilityLoaded(true);
    }
  };

  // Calculate available time slots for selected date
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate || !availabilityLoaded || !availability?.prefs) return [];

    const dayOfWeek = selectedDate.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    const workingHours = availability.prefs.working_hours || {};
    const dayConfig = workingHours[dayName];
    if (!dayConfig?.start || !dayConfig?.end) return [];

    const bufferTime = availability.prefs.buffer_time || 0;
    const allowBackToBack = availability.prefs.allow_back_to_back;
    
    // Generate 30-minute slots
    const slots: string[] = [];
    const [startHour, startMin] = dayConfig.start.split(':').map(Number);
    const [endHour, endMin] = dayConfig.end.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMin = startMin;
    
    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const slotTime = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
      
      const slotStart = new Date(selectedDate);
      slotStart.setHours(currentHour, currentMin, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + parseInt(duration) * 60000);
      
      // Check for conflicts with existing appointments, respecting buffer time
      const hasConflict = availability.appointments?.some((apt: any) => {
        const aptStart = new Date(apt.appointment_date);
        const aptEnd = new Date(aptStart.getTime() + apt.duration_minutes * 60000);
        
        if (!allowBackToBack && bufferTime > 0) {
          const bufferedStart = new Date(aptStart.getTime() - bufferTime * 60000);
          const bufferedEnd = new Date(aptEnd.getTime() + bufferTime * 60000);
          return slotStart < bufferedEnd && slotEnd > bufferedStart;
        }
        
        return slotStart < aptEnd && slotEnd > aptStart;
      });

      const dayEnd = new Date(selectedDate);
      dayEnd.setHours(endHour, endMin, 0, 0);
      
      if (!hasConflict && slotEnd <= dayEnd) {
        slots.push(slotTime);
      }
      
      currentMin += 30;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour++;
      }
    }
    
    return slots;
  }, [selectedDate, duration, availability]);

  // Check if a date has any availability - must check actual available slots
  const isDateAvailable = (date: Date) => {
    if (!availabilityLoaded || !availability?.prefs) return false;
    
    const dayOfWeek = date.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    const workingHours = availability.prefs.working_hours || {};
    const dayConfig = workingHours[dayName];
    
    // Must have working hours configured
    if (!dayConfig?.start || !dayConfig?.end) return false;
    
    // Calculate if there are any available slots for this date with current duration
    const bufferTime = availability.prefs.buffer_time || 0;
    const allowBackToBack = availability.prefs.allow_back_to_back;
    const [startHour, startMin] = dayConfig.start.split(':').map(Number);
    const [endHour, endMin] = dayConfig.end.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMin = startMin;
    
    // Check if at least one slot is available
    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const slotStart = new Date(date);
      slotStart.setHours(currentHour, currentMin, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + parseInt(duration) * 60000);
      
      const hasConflict = availability.appointments?.some((apt: any) => {
        const aptStart = new Date(apt.appointment_date);
        const aptEnd = new Date(aptStart.getTime() + apt.duration_minutes * 60000);
        
        if (!allowBackToBack && bufferTime > 0) {
          const bufferedStart = new Date(aptStart.getTime() - bufferTime * 60000);
          const bufferedEnd = new Date(aptEnd.getTime() + bufferTime * 60000);
          return slotStart < bufferedEnd && slotEnd > bufferedStart;
        }
        
        return slotStart < aptEnd && slotEnd > aptStart;
      });

      const dayEnd = new Date(date);
      dayEnd.setHours(endHour, endMin, 0, 0);
      
      // If we find one available slot, the date is available
      if (!hasConflict && slotEnd <= dayEnd) {
        return true;
      }
      
      currentMin += 30;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour++;
      }
    }
    
    // No available slots found
    return false;
  };

  const handleRequest = async () => {
    if (!selectedDate) {
      toast({ title: "Please select a date", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const [hours, minutes] = selectedTime.split(':');
      const requestedDateTime = new Date(selectedDate);
      requestedDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const { error } = await supabase
        .from("appointment_requests")
        .insert({
          client_id: clientId,
          therapist_id: therapistId,
          requested_date: requestedDateTime.toISOString(),
          duration_minutes: parseInt(duration),
          notes: notes.trim() || null,
          status: 'pending',
        });

      if (error) throw error;

      // Send notification to therapist
      await supabase
        .from("notifications")
        .insert({
          user_id: therapistId,
          title: "New Appointment Request",
          message: `A client has requested an appointment on ${requestedDateTime.toLocaleDateString()} at ${selectedTime}`,
          type: 'info',
          link: '/appointments?tab=requests',
        });

      toast({ title: "Request sent successfully", description: "Your therapist will respond soon" });
      onOpenChange(false);
      setSelectedDate(undefined);
      setNotes("");
    } catch (error) {
      console.error("Error requesting appointment:", error);
      toast({ title: "Failed to send request", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">{/* Fixed: Added scroll and max height */}
        <DialogHeader>
          <DialogTitle>Request Appointment</DialogTitle>
          <DialogDescription>
            Choose a time and your therapist will respond
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Date</Label>
            <div className="flex gap-2 mb-2">
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                Available
              </Badge>
              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                Unavailable
              </Badge>
            </div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => setSelectedDate(date ? new Date(date) : undefined)}
              className="rounded-md border"
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              modifiers={availabilityLoaded ? {
                available: (date) => isDateAvailable(date) && date >= new Date(new Date().setHours(0, 0, 0, 0)),
                unavailable: (date) => !isDateAvailable(date) && date >= new Date(new Date().setHours(0, 0, 0, 0))
              } : undefined}
              modifiersClassNames={{
                available: "bg-green-500/10 text-green-600",
                unavailable: "bg-red-500/10 text-red-600 line-through"
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger id="duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">
              <Clock className="inline w-4 h-4 mr-1" />
              Available Time Slots
            </Label>
            {selectedDate ? (
              availableTimeSlots.length > 0 ? (
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger id="time">
                    <SelectValue placeholder="Select a time" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTimeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                  No available slots for this duration on the selected date.
                </p>
              )
            ) : (
              <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                Please select a date first
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger id="time">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 18 }, (_, i) => i + 7).map(hour => (
                    <>
                      <SelectItem key={`${hour}:00`} value={`${hour.toString().padStart(2, '0')}:00`}>
                        {hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? 'PM' : 'AM'}
                      </SelectItem>
                      <SelectItem key={`${hour}:30`} value={`${hour.toString().padStart(2, '0')}:30`}>
                        {hour > 12 ? hour - 12 : hour}:30 {hour >= 12 ? 'PM' : 'AM'}
                      </SelectItem>
                    </>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger id="duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                  <SelectItem value="90">90 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific topics or preferences..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleRequest} disabled={sending || !selectedDate}>
            {sending ? "Sending..." : "Send Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

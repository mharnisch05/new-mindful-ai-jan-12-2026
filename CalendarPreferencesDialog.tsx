import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CalendarPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export function CalendarPreferencesDialog({ open, onOpenChange }: CalendarPreferencesDialogProps) {
  const [preferences, setPreferences] = useState<any>(null);
  const [workingHours, setWorkingHours] = useState<Record<string, { start: string; end: string; enabled: boolean }>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadPreferences();
    }
  }, [open]);

  const loadPreferences = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("calendar_preferences")
      .select("*")
      .eq("therapist_id", user.id)
      .maybeSingle();

    if (data) {
      setPreferences(data);
      const hours = data.working_hours as any;
      const hoursWithEnabled = Object.keys(hours).reduce((acc, day) => ({
        ...acc,
        [day]: { ...hours[day], enabled: true }
      }), {});
      setWorkingHours(hoursWithEnabled);
    } else {
      // Set defaults
      const defaultHours = DAYS.reduce((acc, day) => ({
        ...acc,
        [day]: { start: "09:00", end: "17:00", enabled: ["monday", "tuesday", "wednesday", "thursday", "friday"].includes(day) }
      }), {});
      setWorkingHours(defaultHours);
      setPreferences({
        default_appointment_duration: 60,
        buffer_time: 15,
        allow_back_to_back: false,
        timezone: "America/New_York",
        max_daily_appointments: null,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Filter out disabled days
    const activeWorkingHours = Object.keys(workingHours)
      .filter(day => workingHours[day].enabled)
      .reduce((acc, day) => ({
        ...acc,
        [day]: { start: workingHours[day].start, end: workingHours[day].end }
      }), {});

    const payload = {
      therapist_id: user.id,
      working_hours: activeWorkingHours,
      timezone: preferences.timezone,
      default_appointment_duration: parseInt(preferences.default_appointment_duration),
      buffer_time: parseInt(preferences.buffer_time),
      allow_back_to_back: preferences.allow_back_to_back,
      max_daily_appointments: preferences.max_daily_appointments ? parseInt(preferences.max_daily_appointments) : null,
    };

    const { error } = await supabase
      .from("calendar_preferences")
      .upsert(payload);

    if (error) {
      toast({ 
        title: "Error saving preferences",
        description: error.message,
        variant: "destructive" 
      });
    } else {
      toast({ title: "Calendar preferences saved" });
      onOpenChange(false);
    }
  };

  if (!preferences) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>Calendar Preferences</DialogTitle>
          <DialogDescription>Configure your calendar settings and working hours</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium">Working Hours</h3>
              {DAYS.map(day => (
                <div key={day} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-32">
                    <Switch
                      checked={workingHours[day]?.enabled || false}
                      onCheckedChange={(checked) => setWorkingHours({
                        ...workingHours,
                        [day]: { ...workingHours[day], enabled: checked }
                      })}
                    />
                    <Label className="capitalize">{day}</Label>
                  </div>
                  {workingHours[day]?.enabled && (
                    <>
                      <Input
                        type="time"
                        value={workingHours[day]?.start || "09:00"}
                        onChange={(e) => setWorkingHours({
                          ...workingHours,
                          [day]: { ...workingHours[day], start: e.target.value }
                        })}
                        className="w-32"
                      />
                      <span>to</span>
                      <Input
                        type="time"
                        value={workingHours[day]?.end || "17:00"}
                        onChange={(e) => setWorkingHours({
                          ...workingHours,
                          [day]: { ...workingHours[day], end: e.target.value }
                        })}
                        className="w-32"
                      />
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Appointment Duration</Label>
                <Select 
                  value={preferences.default_appointment_duration?.toString()} 
                  onValueChange={(value) => setPreferences({...preferences, default_appointment_duration: value})}
                >
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
                <Label>Buffer Time Between Appointments</Label>
                <Select 
                  value={preferences.buffer_time?.toString()} 
                  onValueChange={(value) => setPreferences({...preferences, buffer_time: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    <SelectItem value="0">No buffer</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Maximum Daily Appointments (Optional)</Label>
              <Input
                type="number"
                min="1"
                placeholder="No limit"
                value={preferences.max_daily_appointments || ""}
                onChange={(e) => setPreferences({...preferences, max_daily_appointments: e.target.value})}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={preferences.allow_back_to_back}
                onCheckedChange={(checked) => setPreferences({...preferences, allow_back_to_back: checked})}
              />
              <Label>Allow back-to-back appointments (no buffer)</Label>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="submit">Save Preferences</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

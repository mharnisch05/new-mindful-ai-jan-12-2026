import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface ConfigOptions {
  [key: string]: string | boolean | number;
}

interface IntegrationConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integrationType: string;
  currentConfig: ConfigOptions;
  onSave: (config: ConfigOptions) => Promise<void>;
}

export function IntegrationConfigDialog({ open, onOpenChange, integrationType, currentConfig, onSave }: IntegrationConfigDialogProps) {
  const [config, setConfig] = useState<ConfigOptions>(currentConfig || {});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(config);
      toast.success("Configuration saved successfully");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const renderZoomConfig = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="meeting-password">Default Meeting Password</Label>
        <Input
          id="meeting-password"
          type="password"
          placeholder="Leave blank for no password"
          value={config.meeting_password as string || ""}
          onChange={(e) => setConfig({ ...config, meeting_password: e.target.value })}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="waiting-room">Enable Waiting Room</Label>
        <Switch
          id="waiting-room"
          checked={config.waiting_room as boolean || false}
          onCheckedChange={(checked) => setConfig({ ...config, waiting_room: checked })}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="auto-record">Auto-Record Meetings</Label>
        <Switch
          id="auto-record"
          checked={config.auto_record as boolean || false}
          onCheckedChange={(checked) => setConfig({ ...config, auto_record: checked })}
        />
      </div>
    </>
  );

  const renderGoogleCalendarConfig = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="calendar-sync">Calendar to Sync</Label>
        <Select
          value={config.calendar_id as string || "primary"}
          onValueChange={(value) => setConfig({ ...config, calendar_id: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select calendar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="primary">Primary Calendar</SelectItem>
            <SelectItem value="work">Work Calendar</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="conflict-handling">Conflict Handling</Label>
        <Select
          value={config.conflict_handling as string || "block"}
          onValueChange={(value) => setConfig({ ...config, conflict_handling: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select handling" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="block">Block Conflicting Times</SelectItem>
            <SelectItem value="warn">Warn on Conflicts</SelectItem>
            <SelectItem value="allow">Allow Overlaps</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="two-way-sync">Two-Way Sync</Label>
        <Switch
          id="two-way-sync"
          checked={config.two_way_sync as boolean || true}
          onCheckedChange={(checked) => setConfig({ ...config, two_way_sync: checked })}
        />
      </div>
    </>
  );

  const renderTwilioConfig = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="reminder-template">SMS Reminder Template</Label>
        <Textarea
          id="reminder-template"
          placeholder="Hi {client_name}, reminder for your appointment with Dr. {therapist_name} {time}. {zoom_link}"
          value={config.reminder_template as string || ""}
          onChange={(e) => setConfig({ ...config, reminder_template: e.target.value })}
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Variables: {"{client_name}"}, {"{therapist_name}"}, {"{time}"}, {"{zoom_link}"}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="reminder-timing">Send Reminder</Label>
        <Select
          value={config.reminder_timing as string || "24h"}
          onValueChange={(value) => setConfig({ ...config, reminder_timing: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select timing" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">24 hours before</SelectItem>
            <SelectItem value="2h">2 hours before</SelectItem>
            <SelectItem value="1h">1 hour before</SelectItem>
            <SelectItem value="30m">30 minutes before</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="opt-out">Allow Opt-Out</Label>
        <Switch
          id="opt-out"
          checked={config.allow_opt_out as boolean || true}
          onCheckedChange={(checked) => setConfig({ ...config, allow_opt_out: checked })}
        />
      </div>
    </>
  );

  const renderStripeConfig = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="stripe-mode">Mode</Label>
        <Select
          value={config.mode as string || "live"}
          onValueChange={(value) => setConfig({ ...config, mode: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test Mode</SelectItem>
            <SelectItem value="live">Live Mode</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="currency">Default Currency</Label>
        <Select
          value={config.currency as string || "usd"}
          onValueChange={(value) => setConfig({ ...config, currency: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="usd">USD - US Dollar</SelectItem>
            <SelectItem value="eur">EUR - Euro</SelectItem>
            <SelectItem value="gbp">GBP - British Pound</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="receipt-email">Receipt Email Template</Label>
        <Input
          id="receipt-email"
          placeholder="Thank you for your payment..."
          value={config.receipt_template as string || ""}
          onChange={(e) => setConfig({ ...config, receipt_template: e.target.value })}
        />
      </div>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {integrationType === "zoom" && "Zoom Configuration"}
            {integrationType === "google_calendar" && "Google Calendar Configuration"}
            {integrationType === "twilio" && "Twilio SMS Configuration"}
            {integrationType === "stripe" && "Stripe Configuration"}
          </DialogTitle>
          <DialogDescription>
            Configure your {integrationType.replace("_", " ")} integration settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {integrationType === "zoom" && renderZoomConfig()}
          {integrationType === "google_calendar" && renderGoogleCalendarConfig()}
          {integrationType === "twilio" && renderTwilioConfig()}
          {integrationType === "stripe" && renderStripeConfig()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Configuration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
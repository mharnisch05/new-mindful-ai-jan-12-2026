import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Save, Mail, Bell, Shield } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface SystemSettings {
  email_notifications_enabled: boolean;
  session_timeout_minutes: number;
  require_2fa: boolean;
  max_login_attempts: number;
  password_min_length: number;
}

export function SystemSettingsPanel() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemSettings>({
    email_notifications_enabled: true,
    session_timeout_minutes: 30,
    require_2fa: false,
    max_login_attempts: 5,
    password_min_length: 8,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Store settings in localStorage for now (can be moved to database later)
      localStorage.setItem('system_settings', JSON.stringify(settings));
      
      toast({
        title: "Settings saved",
        description: "System settings updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error saving settings",
        description: "Failed to update system settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    // Load settings from localStorage
    const stored = localStorage.getItem('system_settings');
    if (stored) {
      setSettings(JSON.parse(stored));
    }
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
          <CardDescription>Configure system notification settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-notif" className="text-base">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Send email notifications for appointments and reminders</p>
            </div>
            <Switch
              id="email-notif"
              checked={settings.email_notifications_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, email_notifications_enabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Settings
          </CardTitle>
          <CardDescription>Configure authentication and security policies</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
            <Input
              id="session-timeout"
              type="number"
              min="5"
              max="120"
              value={settings.session_timeout_minutes}
              onChange={(e) => setSettings({ ...settings, session_timeout_minutes: parseInt(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">
              Auto-logout after inactivity (5-120 minutes)
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="require-2fa" className="text-base">Require Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">Force all users to enable 2FA</p>
            </div>
            <Switch
              id="require-2fa"
              checked={settings.require_2fa}
              onCheckedChange={(checked) => setSettings({ ...settings, require_2fa: checked })}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="max-attempts">Max Login Attempts</Label>
            <Input
              id="max-attempts"
              type="number"
              min="3"
              max="10"
              value={settings.max_login_attempts}
              onChange={(e) => setSettings({ ...settings, max_login_attempts: parseInt(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">
              Lock account after failed login attempts (3-10)
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="password-length">Minimum Password Length</Label>
            <Input
              id="password-length"
              type="number"
              min="6"
              max="20"
              value={settings.password_min_length}
              onChange={(e) => setSettings({ ...settings, password_min_length: parseInt(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">
              Require passwords to be at least this many characters (6-20)
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { User, Moon, Sun, Bell, Mail } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ClientSettings() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });
  const [notificationSettings, setNotificationSettings] = useState({
    emailEnabled: true,
    appointmentReminders: true,
    messageNotifications: true,
    progressUpdates: true,
    invoiceNotifications: true,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    setUser(user);

    // Get client data
    const { data: clientUser } = await supabase
      .from("client_users")
      .select("*, clients(*)")
      .eq("user_id", user.id)
      .single();

    if (clientUser?.clients) {
      setProfile({
        first_name: clientUser.clients.first_name || "",
        last_name: clientUser.clients.last_name || "",
        email: clientUser.clients.email || user.email || "",
        phone: clientUser.clients.phone || "",
      });
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Update client record
      const { data: clientUser } = await supabase
        .from("client_users")
        .select("client_id")
        .eq("user_id", user.id)
        .single();

      if (clientUser) {
        const { error } = await supabase
          .from("clients")
          .update({
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email,
            phone: profile.phone || null,
          })
          .eq("id", clientUser.client_id);

        if (error) throw error;
      }

      toast({ title: "Profile updated successfully" });
    } catch (error: any) {
      toast({ title: "Error updating profile", description: error.message, variant: "destructive" });
    }
  };

  const handleNotificationSettingsSave = () => {
    // TODO: Save notification settings to database
    toast({ title: "Notification preferences saved" });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate("/client-portal")}>
              ← Back to Portal
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 max-w-4xl space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your preferences</p>
        </div>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <CardTitle>Profile Information</CardTitle>
            </div>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={profile.first_name}
                    onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={profile.last_name}
                    onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
              <Button type="submit" className="w-full">Save Changes</Button>
            </form>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <CardTitle>Notification Preferences</CardTitle>
            </div>
            <CardDescription>Choose how you want to receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <Label>Email Notifications</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
                <Switch
                  checked={notificationSettings.emailEnabled}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, emailEnabled: checked })
                  }
                />
              </div>

            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Notification Types</h3>
              
              <div className="flex items-center justify-between">
                <Label>Appointment Reminders</Label>
                <Switch
                  checked={notificationSettings.appointmentReminders}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, appointmentReminders: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>New Messages</Label>
                <Switch
                  checked={notificationSettings.messageNotifications}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, messageNotifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Progress Path Updates</Label>
                <Switch
                  checked={notificationSettings.progressUpdates}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, progressUpdates: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Invoice Notifications</Label>
                <Switch
                  checked={notificationSettings.invoiceNotifications}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, invoiceNotifications: checked })
                  }
                />
              </div>
            </div>

            <Button onClick={handleNotificationSettingsSave} className="w-full">
              Save Notification Preferences
            </Button>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {theme === "dark" ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
              <CardTitle>Appearance</CardTitle>
            </div>
            <CardDescription>Customize the look and feel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

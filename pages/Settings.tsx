import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { User, Moon, Sun, Download, Trash2, AlertTriangle, LayoutDashboard, CreditCard, Clock, Video, CheckCircle, XCircle, FileDown, Settings as SettingsIcon, Image as ImageIcon } from "lucide-react";
import { ExportDataDialog } from "@/components/dialogs/ExportDataDialog";
import { IntegrationSettings } from "@/components/admin/IntegrationSettings";
import { useTheme } from "@/components/ThemeProvider";
import { LogoUploadWithPreview } from "@/components/settings/LogoUploadWithPreview";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserSettings } from "@/hooks/useUserSettings";
import { Badge } from "@/components/ui/badge";
import { TwoFactorSetup } from "@/components/security/TwoFactorSetup";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { AuditLogViewer } from "@/components/settings/AuditLogViewer";
import { Link } from "react-router-dom";
import { useDemoGuard } from "@/hooks/useDemoGuard";

export default function Settings() {
  useSessionTimeout(); // Enable session timeout
  const { shouldBlock } = useDemoGuard();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: "",
    official_title: "",
    specialty: "",
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [zoomConnected, setZoomConnected] = useState(false);
  const [checkingZoom, setCheckingZoom] = useState(true);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [practiceName, setPracticeName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings, resetToDefault } = useUserSettings();

  useEffect(() => {
    fetchProfile();
    checkSubscription();
    checkZoomConnection();
    loadPracticeSettings();

    // Handle OAuth callback
    const code = searchParams.get('code');
    if (code) {
      handleZoomCallback(code);
    }
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUser(user);

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      setProfile({
        full_name: data.full_name || "",
        email: data.email || user.email || "",
        phone: data.phone || "",
        official_title: data.official_title || "",
        specialty: data.specialty || "",
      });
    } else {
      setProfile((prev) => ({ ...prev, email: user.email || "" }));
    }
    setLoading(false);
  };

  const loadPracticeSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("practice_settings")
        .select("*")
        .eq("therapist_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setPracticeName(data.practice_name || "");
        setLogoUrl(data.logo_url);
      }
    } catch (error) {
      // Silent fail for non-critical settings load
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;

    setUploadingLogo(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = logoFile.name.split(".").pop();
      const fileName = `${user.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("practice-logos")
        .upload(fileName, logoFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("practice-logos")
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);

      // Update practice settings
      const { error: settingsError } = await supabase
        .from("practice_settings")
        .upsert({
          therapist_id: user.id,
          logo_url: publicUrl,
          practice_name: practiceName,
        });

      if (settingsError) throw settingsError;

      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      setSubscriptionStatus(data);
      
      // Calculate trial days left
      if (data?.trial_end) {
        const trialEndDate = new Date(data.trial_end);
        const now = new Date();
        const daysLeft = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        setTrialDaysLeft(daysLeft > 0 ? daysLeft : 0);
      } else {
        setTrialDaysLeft(null);
      }
    } catch (error) {
      // Silent fail for subscription check
    } finally {
      setCheckingSubscription(false);
    }
  };

  const checkZoomConnection = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("zoom-oauth", {
        body: { action: "check" }
      });
      if (error) throw error;
      setZoomConnected(data?.connected || false);
    } catch (error) {
      // Silent fail for Zoom check
    } finally {
      setCheckingZoom(false);
    }
  };

  const handleConnectZoom = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("zoom-oauth", {
        body: { action: "authorize" }
      });
      if (error) throw error;
      window.location.href = data.authUrl;
    } catch (error: any) {
      toast({ 
        title: "Failed to connect Zoom", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    }
  };

  const handleZoomCallback = async (code: string) => {
    try {
      const { error } = await supabase.functions.invoke("zoom-oauth", {
        body: { action: "callback", code }
      });
      if (error) throw error;
      toast({ title: "Zoom connected successfully!" });
      setZoomConnected(true);
      // Clear URL parameters
      window.history.replaceState({}, '', '/settings');
    } catch (error: any) {
      toast({ 
        title: "Failed to connect Zoom", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    }
  };

  const handleDisconnectZoom = async () => {
    try {
      const { error } = await supabase.functions.invoke("zoom-oauth", {
        body: { action: "disconnect" }
      });
      if (error) throw error;
      setZoomConnected(false);
      toast({ title: "Zoom disconnected" });
    } catch (error: any) {
      toast({ 
        title: "Failed to disconnect Zoom", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      
      // Open in new tab to maintain session
      window.open(data.url, '_blank');
    } catch (error: any) {
      toast({
        title: "Failed to open subscription manager",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: profile.full_name,
          email: profile.email,
          phone: profile.phone || null,
          official_title: profile.official_title || null,
          specialty: profile.specialty || null,
        });

      if (error) throw error;

      // Also update auth metadata so header name reflects changes
      const { error: metaError } = await supabase.auth.updateUser({ data: { full_name: profile.full_name } });
      
      // Update practice settings
      const { error: settingsError } = await supabase
        .from("practice_settings")
        .upsert({
          therapist_id: user.id,
          practice_name: practiceName,
          logo_url: logoUrl,
        });

      if (metaError) {
        toast({ title: "Profile saved, but failed to update display name", variant: "destructive" });
      } else if (settingsError) {
        toast({ title: "Profile saved, but failed to update practice settings", variant: "destructive" });
      } else {
        toast({ 
          title: "Changes saved", 
          description: "Your profile has been updated successfully",
          duration: 4000 
        });
      }
    } catch (error) {
      toast({ title: "Error updating profile", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    setExporting(true);

    try {
      // Fetch all user data
      const [clientsRes, appointmentsRes, notesRes, invoicesRes, remindersRes] = await Promise.all([
        supabase.from("clients").select("*").eq("therapist_id", user.id),
        supabase.from("appointments").select("*").eq("therapist_id", user.id),
        supabase.from("soap_notes").select("*").eq("therapist_id", user.id),
        supabase.from("invoices").select("*").eq("therapist_id", user.id),
        supabase.from("reminders").select("*").eq("therapist_id", user.id),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        profile: profile,
        clients: clientsRes.data || [],
        appointments: appointmentsRes.data || [],
        soap_notes: notesRes.data || [],
        invoices: invoicesRes.data || [],
        reminders: remindersRes.data || [],
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `therapy-muse-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: "Data exported successfully" });
    } catch (error: any) {
      toast({ 
        title: "Error exporting data", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    try {
      // Delete all user data in order (due to foreign key constraints)
      await Promise.all([
        supabase.from("soap_notes").delete().eq("therapist_id", user.id),
        supabase.from("invoices").delete().eq("therapist_id", user.id),
        supabase.from("reminders").delete().eq("therapist_id", user.id),
      ]);

      await supabase.from("appointments").delete().eq("therapist_id", user.id);
      await supabase.from("clients").delete().eq("therapist_id", user.id);
      await supabase.from("profiles").delete().eq("id", user.id);

      // Sign out
      await supabase.auth.signOut();
      
      toast({ title: "Account deleted successfully" });
      navigate("/auth");
    } catch (error: any) {
      toast({ 
        title: "Error deleting account", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <CardTitle>Profile Information</CardTitle>
          </div>
          <CardDescription>Update your personal and professional details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="Dr. Jane Smith"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="jane@example.com"
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
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Professional Information</h3>
              <div className="space-y-2">
                <Label htmlFor="official_title">Official Title</Label>
                <Input
                  id="official_title"
                  value={profile.official_title}
                  onChange={(e) => setProfile({ ...profile, official_title: e.target.value })}
                  placeholder="e.g., Doctor, Therapist, Counselor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialty">Specialty</Label>
                <Input
                  id="specialty"
                  value={profile.specialty}
                  onChange={(e) => setProfile({ ...profile, specialty: e.target.value })}
                  placeholder="e.g., CBT, Couples Therapy"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Practice Branding</h3>
              <div className="space-y-2">
                <Label htmlFor="practiceName">Practice Name</Label>
                <Input
                  id="practiceName"
                  value={practiceName}
                  onChange={(e) => setPracticeName(e.target.value)}
                  placeholder="Enter your practice name"
                />
              </div>
              <LogoUploadWithPreview
                currentLogoUrl={logoUrl}
                onLogoUpdate={setLogoUrl}
                practiceName={practiceName}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>


      {/* Subscription */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <CardTitle>Subscription</CardTitle>
          </div>
          <CardDescription>Manage your subscription and billing</CardDescription>
        </CardHeader>
        <CardContent>
          {checkingSubscription ? (
            <p className="text-muted-foreground">Checking subscription...</p>
          ) : subscriptionStatus?.subscribed ? (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Current Plan</p>
                  <Badge variant="default">
                    {subscriptionStatus.plan_tier === "solo" ? "Solo" : subscriptionStatus.plan_tier === "group" ? "Group" : "Enterprise"}
                  </Badge>
                </div>
                
                {trialDaysLeft !== null && trialDaysLeft > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <Clock className="w-4 h-4 text-primary" />
                    <p className="text-sm">
                      <span className="font-semibold">{trialDaysLeft} days</span> left in your free trial
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Features included:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Unlimited clients</li>
                    <li>• Smart scheduling & SOAP notes</li>
                    <li>• Client portal & messaging</li>
                    {subscriptionStatus.features?.ai_assistant && (
                      <li className="text-primary font-medium">• AI-powered assistant</li>
                    )}
                  </ul>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleManageSubscription} variant="outline" className="flex-1">
                  Manage Subscription
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">You're currently on the Free plan</p>
              <Button onClick={() => navigate("/pricing")}>
                View Plans
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <TwoFactorSetup />

      {/* Audit Logs */}
      <AuditLogViewer />

      {/* Appearance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {theme === "dark" ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
            <CardTitle>Appearance</CardTitle>
          </div>
          <CardDescription>Customize how Mindful AI looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select value={theme} onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}>
              <SelectTrigger id="theme">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4" />
                    <span>Light</span>
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4" />
                    <span>Dark</span>
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <span>System</span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select the theme for the application or sync with your system settings
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-primary" />
            <CardTitle>Dashboard Customization</CardTitle>
          </div>
          <CardDescription>Manage your dashboard layout and visible widgets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Visible Widgets</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-charts">Analytics Charts</Label>
                  <p className="text-xs text-muted-foreground">
                    Display data visualization charts
                  </p>
                </div>
                <Switch
                  id="show-charts"
                  checked={settings.dashboard_widgets_visible.charts}
                  onCheckedChange={(checked) => 
                    updateSettings({ 
                      dashboard_widgets_visible: { ...settings.dashboard_widgets_visible, charts: checked } 
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-quick-actions">Quick Actions</Label>
                  <p className="text-xs text-muted-foreground">
                    Fast access buttons for common tasks
                  </p>
                </div>
                <Switch
                  id="show-quick-actions"
                  checked={settings.dashboard_widgets_visible.quick_actions}
                  onCheckedChange={(checked) => 
                    updateSettings({ 
                      dashboard_widgets_visible: { ...settings.dashboard_widgets_visible, quick_actions: checked } 
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-appointments">Upcoming Appointments</Label>
                  <p className="text-xs text-muted-foreground">
                    Next scheduled sessions
                  </p>
                </div>
                <Switch
                  id="show-appointments"
                  checked={settings.dashboard_widgets_visible.appointments}
                  onCheckedChange={(checked) => 
                    updateSettings({ 
                      dashboard_widgets_visible: { ...settings.dashboard_widgets_visible, appointments: checked } 
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-reminders">Active Reminders</Label>
                  <p className="text-xs text-muted-foreground">
                    Pending tasks and notifications
                  </p>
                </div>
                <Switch
                  id="show-reminders"
                  checked={settings.dashboard_widgets_visible.reminders}
                  onCheckedChange={(checked) => 
                    updateSettings({ 
                      dashboard_widgets_visible: { ...settings.dashboard_widgets_visible, reminders: checked } 
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-notes">Recent SOAP Notes</Label>
                  <p className="text-xs text-muted-foreground">
                    Latest session documentation
                  </p>
                </div>
                <Switch
                  id="show-notes"
                  checked={settings.dashboard_widgets_visible.recent_notes}
                  onCheckedChange={(checked) => 
                    updateSettings({ 
                      dashboard_widgets_visible: { ...settings.dashboard_widgets_visible, recent_notes: checked } 
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-progress">Progress Path Overview</Label>
                  <p className="text-xs text-muted-foreground">
                    Client progress summaries
                  </p>
                </div>
                <Switch
                  id="show-progress"
                  checked={settings.dashboard_widgets_visible.progress_path}
                  onCheckedChange={(checked) => 
                    updateSettings({ 
                      dashboard_widgets_visible: { ...settings.dashboard_widgets_visible, progress_path: checked } 
                    })
                  }
                />
              </div>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Layout</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Use the "Edit Dashboard" button on your dashboard to drag and reorder widgets
            </p>
            <Button
              variant="outline"
              onClick={resetToDefault}
              size="sm"
            >
              Reset to Default Layout
            </Button>
            <p className="text-xs text-muted-foreground">
              This will restore the default widget order and visibility
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileDown className="w-5 h-5 text-primary" />
            <CardTitle>Data Export</CardTitle>
          </div>
          <CardDescription>Export your data as professional PDFs</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Export specific client data or all your data including appointments, SOAP notes, invoices, and more as formatted PDF documents.
          </p>
          <Button 
            onClick={() => setExportDialogOpen(true)}
            variant="outline"
            className="w-full"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </CardContent>
      </Card>
      
      <ExportDataDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} />

      {/* Integrations */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            <CardTitle>Integrations</CardTitle>
          </div>
          <CardDescription>Connect third-party services to your practice</CardDescription>
        </CardHeader>
        <CardContent>
          <IntegrationSettings />
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>View your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Account ID</p>
            <p className="font-mono text-sm mt-1 p-2 bg-muted rounded">{user?.id}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Member since</p>
            <p className="text-sm mt-1">{new Date(user?.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </div>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Delete Account</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your account and remove all your data from our servers, including:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>All client records</li>
                        <li>All appointments</li>
                        <li>All SOAP notes</li>
                        <li>All invoices</li>
                        <li>All reminders</li>
                      </ul>
                      <p className="mt-3 font-semibold">This action is permanent and irreversible.</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, Delete Everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

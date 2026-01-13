import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Video, Calendar, CreditCard, MessageSquare, CheckCircle2, XCircle, Settings as SettingsIcon } from "lucide-react";
import { IntegrationConfigDialog } from "./IntegrationConfigDialog";

interface Integration {
  id: string;
  integration_type: string;
  is_enabled: boolean;
  config: Record<string, unknown>;
}

const integrationIcons = {
  zoom: Video,
  google_calendar: Calendar,
  stripe: CreditCard,
  twilio: MessageSquare,
  outlook: Calendar,
};

const integrationNames = {
  zoom: "Zoom",
  google_calendar: "Google Calendar",
  stripe: "Stripe",
  twilio: "Twilio SMS",
  outlook: "Outlook Calendar",
};

export function IntegrationSettings() {
  const queryClient = useQueryClient();
  const [editingIntegration, setEditingIntegration] = useState<string | null>(null);
  const [zoomConnected, setZoomConnected] = useState(false);
  const [checkingZoom, setCheckingZoom] = useState(true);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  // Check Zoom connection status on mount
  useEffect(() => {
    checkZoomConnection();
  }, []);

  // Handle OAuth callback from Zoom
  useEffect(() => {
    const handleZoomCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code && window.location.pathname === '/settings') {
        toast.loading("Connecting to Zoom...");
        
        try {
          const { data, error } = await supabase.functions.invoke('zoom-oauth', {
            body: { action: 'callback', code }
          });

          if (error) throw error;

          toast.success("Zoom connected successfully!");
          setZoomConnected(true);
          
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error: any) {
          toast.error(error.message || "Failed to connect Zoom");
        }
      }
    };

    handleZoomCallback();
  }, []);

  const checkZoomConnection = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('zoom-oauth', {
        body: { action: 'check' }
      });

      if (error) throw error;
      setZoomConnected(data?.connected || false);
    } catch (error) {
      // Silent fail for Zoom check
    } finally {
      setCheckingZoom(false);
    }
  };

  const connectZoom = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('zoom-oauth', {
        body: { action: 'authorize' }
      });

      if (error) throw error;

      if (data?.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to start Zoom authorization");
    }
  };

  const connectGoogleCalendar = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'authorize' }
      });

      if (error) throw error;

      if (data?.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to start Google Calendar authorization");
    }
  };

  const connectOutlook = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('outlook-calendar-sync', {
        body: { action: 'authorize' }
      });

      if (error) throw error;

      if (data?.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to start Outlook authorization");
    }
  };

  const checkTwilioStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('twilio-sms', {
        body: { action: 'check_status' }
      });

      if (error) throw error;
      return data?.configured || false;
    } catch (error) {
      // Silent fail for Twilio check
      return false;
    }
  };

  const disconnectZoom = async () => {
    try {
      const { error } = await supabase.functions.invoke('zoom-oauth', {
        body: { action: 'disconnect' }
      });

      if (error) throw error;

      toast.success("Zoom disconnected");
      setZoomConnected(false);
      queryClient.invalidateQueries({ queryKey: ["integration_settings"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to disconnect Zoom");
    }
  };

  const { data: integrations, isLoading } = useQuery({
    queryKey: ["integration_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_settings")
        .select("*")
        .order("integration_type");

      if (error) throw error;
      return data as Integration[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("integration_settings")
        .update({ is_enabled: enabled })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration_settings"] });
      toast.success("Integration updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update integration");
    },
  });

  const handleSaveConfig = async (config: any) => {
    if (!selectedIntegration) return;
    
    const { error } = await supabase
      .from("integration_settings")
      .update({ config })
      .eq("id", selectedIntegration.id);
    
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["integration_settings"] });
  };

  const createIntegration = async (type: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("integration_settings")
        .insert([{
          therapist_id: user.id,
          integration_type: type,
          is_enabled: false,
          config: {}
        }]);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["integration_settings"] });
      toast.success("Integration added");
    } catch (error: any) {
      toast.error(error.message || "Failed to add integration");
    }
  };

  const allIntegrationTypes = ["zoom", "google_calendar", "outlook", "stripe", "twilio"];
  const enabledIntegrationTypes = new Set(integrations?.map(i => i.integration_type) || []);
  const availableIntegrations = allIntegrationTypes.filter(type => !enabledIntegrationTypes.has(type));

  if (isLoading) {
    return <div>Loading integrations...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Integrations</h2>
        <p className="text-muted-foreground">Connect your practice with external services</p>
      </div>

      <div className="grid gap-4">
        {integrations?.map((integration) => {
          const Icon = integrationIcons[integration.integration_type as keyof typeof integrationIcons];
          const name = integrationNames[integration.integration_type as keyof typeof integrationNames];

          return (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {Icon && <Icon className="h-6 w-6" />}
                    <div>
                      <CardTitle>{name}</CardTitle>
                      <CardDescription>
                        {integration.is_enabled ? "Active" : "Inactive"}
                        {integration.integration_type === 'zoom' && (
                          <span className="ml-2">
                            {checkingZoom ? "(Checking...)" : zoomConnected ? (
                              <span className="text-success flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Connected
                              </span>
                            ) : (
                              <span className="text-destructive flex items-center gap-1">
                                <XCircle className="h-3 w-3" /> Not Connected
                              </span>
                            )}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={integration.is_enabled}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({ id: integration.id, enabled: checked })
                    }
                  />
                </div>
              </CardHeader>
              {integration.is_enabled && (
                <CardContent>
                  {integration.integration_type === 'zoom' ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Automatically create Zoom meetings for all scheduled appointments
                      </p>
                      <div className="flex gap-2">
                        {zoomConnected ? (
                          <>
                            <Button variant="outline" onClick={disconnectZoom}>
                              Disconnect Zoom
                            </Button>
                            <Button 
                              variant="secondary" 
                              onClick={() => {
                                setSelectedIntegration(integration);
                                setConfigDialogOpen(true);
                              }}
                            >
                              <SettingsIcon className="w-4 h-4 mr-2" />
                              Configure
                            </Button>
                          </>
                        ) : (
                          <Button onClick={connectZoom}>
                            Connect Zoom Account
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : integration.integration_type === 'google_calendar' ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Sync appointments with Google Calendar
                      </p>
                      <div className="flex gap-2">
                        <Button onClick={connectGoogleCalendar}>
                          Connect Google Calendar
                        </Button>
                        <Button 
                          variant="secondary" 
                          onClick={() => {
                            setSelectedIntegration(integration);
                            setConfigDialogOpen(true);
                          }}
                        >
                          <SettingsIcon className="w-4 h-4 mr-2" />
                          Configure
                        </Button>
                      </div>
                    </div>
                  ) : integration.integration_type === 'outlook' ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Sync appointments with Outlook Calendar
                      </p>
                      <div className="flex gap-2">
                        <Button onClick={connectOutlook}>
                          Connect Outlook Calendar
                        </Button>
                        <Button 
                          variant="secondary" 
                          onClick={() => {
                            setSelectedIntegration(integration);
                            setConfigDialogOpen(true);
                          }}
                        >
                          <SettingsIcon className="w-4 h-4 mr-2" />
                          Configure
                        </Button>
                      </div>
                    </div>
                  ) : integration.integration_type === 'twilio' ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Send SMS reminders to clients. Configure your Twilio credentials in environment variables.
                      </p>
                      <Button 
                        variant="secondary" 
                        onClick={() => {
                          setSelectedIntegration(integration);
                          setConfigDialogOpen(true);
                        }}
                      >
                        <SettingsIcon className="w-4 h-4 mr-2" />
                        Configure SMS Reminders
                      </Button>
                    </div>
                  ) : integration.integration_type === 'stripe' ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Accept payments from clients
                      </p>
                      <Button 
                        variant="secondary" 
                        onClick={() => {
                          setSelectedIntegration(integration);
                          setConfigDialogOpen(true);
                        }}
                      >
                        <SettingsIcon className="w-4 h-4 mr-2" />
                        Configure
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Configuration options will appear here when editing is enabled
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {availableIntegrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Add Integration</CardTitle>
            <CardDescription>Connect additional services to your practice</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {availableIntegrations.map((type) => {
                const Icon = integrationIcons[type as keyof typeof integrationIcons];
                const name = integrationNames[type as keyof typeof integrationNames];
                return (
                  <Button
                    key={type}
                    variant="outline"
                    onClick={() => createIntegration(type)}
                    className="flex items-center space-x-2"
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    <span>{name}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedIntegration && (
        <IntegrationConfigDialog
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
          integrationType={selectedIntegration.integration_type}
          currentConfig={selectedIntegration.config || {}}
          onSave={handleSaveConfig}
        />
      )}
    </div>
  );
}

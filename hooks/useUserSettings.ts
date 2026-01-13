import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserSettings {
  show_dashboard_charts: boolean;
  dashboard_widgets_order: string[];
  dashboard_widgets_visible: Record<string, boolean>;
}

const defaultSettings: UserSettings = {
  show_dashboard_charts: true,
  dashboard_widgets_order: ["quick_actions", "appointments", "reminders", "charts", "progress_path"],
  dashboard_widgets_visible: {
    charts: true,
    appointments: true,
    reminders: true,
    quick_actions: true,
    recent_notes: false,
    progress_path: true,
  },
};

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const updateTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadSettings();
    
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No settings exist yet, create default
          await createDefaultSettings(user.id);
        } else {
          await logError(error instanceof Error ? error : new Error(String(error)), window.location.pathname);
        }
      } else if (data) {
        setSettings({
          show_dashboard_charts: data.show_dashboard_charts,
          dashboard_widgets_order: data.dashboard_widgets_order as string[],
          dashboard_widgets_visible: data.dashboard_widgets_visible as Record<string, boolean>,
        });
      }
    } catch (error) {
      await logError(error instanceof Error ? error : new Error(String(error)), window.location.pathname);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async (userId: string) => {
    try {
      await supabase.from("user_settings").insert({
        user_id: userId,
        ...defaultSettings,
      });
      setSettings(defaultSettings);
    } catch (error) {
      await logError(error instanceof Error ? error : new Error(String(error)), window.location.pathname);
    }
  };

  const updateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    // Immediately update local state for instant UI feedback
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    // Debounce the actual database update
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(async () => {
      if (isSaving) return; // Prevent concurrent saves
      setIsSaving(true);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
          .from("user_settings")
          .update(updatedSettings)
          .eq("user_id", user.id);

        if (error) throw error;

        toast({
          title: "Settings updated",
          description: "Your preferences have been saved",
        });
      } catch (error) {
        await logError(error instanceof Error ? error : new Error(String(error)), window.location.pathname);
        toast({
          title: "Error",
          description: "Failed to update settings",
          variant: "destructive",
        });
        // Revert on error
        loadSettings();
      } finally {
        setIsSaving(false);
      }
    }, 500); // 500ms debounce
  }, [settings, isSaving, toast]);

  const resetToDefault = async () => {
    await updateSettings(defaultSettings);
  };

  return {
    settings,
    loading,
    updateSettings,
    resetToDefault,
  };
}

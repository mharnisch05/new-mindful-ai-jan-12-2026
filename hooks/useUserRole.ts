import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/utils/errorTracking";

export type UserRole = "professional" | "client" | null;

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === "SIGNED_IN") {
          await checkUserRole();
        } else if (event === "SIGNED_OUT") {
          setRole(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        await logError(error instanceof Error ? error : new Error(String(error)), window.location.pathname);
        setRole(null);
      } else {
        setRole(data?.role as UserRole || null);
      }
    } catch (error) {
      await logError(error instanceof Error ? error : new Error(String(error)), window.location.pathname);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  return { role, loading, refreshRole: checkUserRole };
}

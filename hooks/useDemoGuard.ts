import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const DEMO_EMAIL = "trial@test.com";

/**
 * Hook to check if current user is in demo mode and guard write operations.
 * Use this in any component that performs write operations.
 */
export function useDemoGuard() {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkDemoMode = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsDemoMode(user?.email === DEMO_EMAIL);
    };

    checkDemoMode();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      setIsDemoMode(session?.user?.email === DEMO_EMAIL);
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Shows demo mode toast notification
   */
  const showDemoToast = () => {
    toast({
      title: "Demo Account",
      description: "This is a demo account and cannot make changes.",
      variant: "default",
    });
  };

  /**
   * Guards an async action - returns false and shows toast if in demo mode
   */
  const guardAction = async (action: () => Promise<void> | void): Promise<boolean> => {
    if (isDemoMode) {
      showDemoToast();
      return false;
    }
    await action();
    return true;
  };

  /**
   * Returns true if the action should be blocked (demo mode)
   */
  const shouldBlock = (): boolean => {
    if (isDemoMode) {
      showDemoToast();
      return true;
    }
    return false;
  };

  return { isDemoMode, showDemoToast, guardAction, shouldBlock };
}

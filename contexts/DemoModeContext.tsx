import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/** Demo account credentials */
export const DEMO_EMAIL = "trial@test.com";
export const DEMO_PASSWORD = "Mysoftwareisamazing123";
export const DEMO_CLIENT_CODE = "AB123";

interface DemoModeContextType {
  isDemoMode: boolean;
  isLoading: boolean;
  showDemoToast: () => void;
  /** Blocks write operations and shows demo toast */
  guardDemoAction: (action: () => Promise<void> | void) => Promise<boolean>;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkDemoMode();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.email === DEMO_EMAIL) {
        setIsDemoMode(true);
      } else {
        setIsDemoMode(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkDemoMode = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsDemoMode(user?.email === DEMO_EMAIL);
    } catch (error) {
      // Silent fail for demo mode check
    } finally {
      setIsLoading(false);
    }
  };

  const showDemoToast = () => {
    toast({
      title: "Demo Account",
      description: "This is a demo account and cannot make changes.",
      variant: "default",
    });
  };

  const guardDemoAction = async (action: () => Promise<void> | void): Promise<boolean> => {
    if (isDemoMode) {
      showDemoToast();
      return false;
    }
    await action();
    return true;
  };

  return (
    <DemoModeContext.Provider value={{ isDemoMode, isLoading, showDemoToast, guardDemoAction }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (context === undefined) {
    throw new Error("useDemoMode must be used within a DemoModeProvider");
  }
  return context;
}

/**
 * Hook that returns a guarded version of any async function.
 * If in demo mode, shows toast and returns without executing.
 */
export function useDemoGuard() {
  const { isDemoMode, showDemoToast } = useDemoMode();

  const guard = <T extends (...args: any[]) => Promise<any>>(fn: T): T => {
    return (async (...args: Parameters<T>) => {
      if (isDemoMode) {
        showDemoToast();
        return;
      }
      return fn(...args);
    }) as T;
  };

  return { guard, isDemoMode, showDemoToast };
}

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionFeatures {
  ai_assistant: boolean;
  unlimited_clients: boolean;
  advanced_analytics: boolean;
}

interface SubscriptionContextType {
  subscribed: boolean;
  planTier: "solo" | "group" | "enterprise" | null;
  features: SubscriptionFeatures;
  trialDaysLeft: number | null;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscribed, setSubscribed] = useState(false);
  const [planTier, setPlanTier] = useState<"solo" | "group" | "enterprise" | null>(null);
  const [features, setFeatures] = useState<SubscriptionFeatures>({
    ai_assistant: false,
    unlimited_clients: false,
    advanced_analytics: false,
  });
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setSubscribed(false);
        setPlanTier(null);
        setFeatures({
          ai_assistant: false,
          unlimited_clients: false,
          advanced_analytics: false,
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription");
      
      if (error) {
        // Silent fail for subscription check - will retry on next auth change
        setLoading(false);
        return;
      }

      setSubscribed(data.subscribed || false);
      setPlanTier(data.plan_tier || null);
      setFeatures(data.features || {
        ai_assistant: false,
        unlimited_clients: false,
        advanced_analytics: false,
      });

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
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();

    // Refresh subscription on auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSubscription();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value: SubscriptionContextType = {
    subscribed,
    planTier,
    features,
    trialDaysLeft,
    loading,
    refreshSubscription: checkSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}

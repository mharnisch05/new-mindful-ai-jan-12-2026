import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/utils/errorTracking';

export function useOnboarding() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_onboarding')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        await logError(error instanceof Error ? error : new Error(String(error)), window.location.pathname);
      }

      // Show tutorial if user hasn't completed or dismissed it
      if (!data || (!data.tutorial_completed && !data.tutorial_dismissed)) {
        setShowTutorial(true);
      }
    } catch (error) {
      await logError(error instanceof Error ? error : new Error(String(error)), window.location.pathname);
    } finally {
      setLoading(false);
    }
  };

  return { showTutorial, setShowTutorial, loading };
}

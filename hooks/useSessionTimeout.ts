import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { trackSecurityEvent, logError } from '@/utils/errorTracking';

const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const WARNING_TIME = 1 * 60 * 1000; // 1 minute before timeout
const HEARTBEAT_INTERVAL = 2 * 60 * 1000; // 2 minutes

export function useSessionTimeout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningRef = useRef<NodeJS.Timeout>();
  const heartbeatRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());

  const updateLastActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const sendHeartbeat = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Update last_activity in user_sessions table
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('user_sessions')
            .update({ last_activity: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('session_token', session.access_token);
        }
      }
    } catch (error) {
      await logError(error instanceof Error ? error : new Error(String(error)), window.location.pathname);
    }
  }, []);

  const handleSessionExpiry = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await trackSecurityEvent(
        user.id,
        'SESSION_TIMEOUT',
        'authentication',
        true,
        { reason: 'inactivity', duration_minutes: SESSION_TIMEOUT / 60000 }
      );
    }

    await supabase.auth.signOut();
    toast({
      title: "Session Expired",
      description: "You have been logged out due to inactivity.",
      variant: "destructive",
    });
    navigate('/auth');
  }, [navigate, toast]);

  const resetTimer = useCallback(() => {
    updateLastActivity();

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    warningRef.current = setTimeout(() => {
      toast({
        title: "Session Expiring Soon",
        description: "You will be signed out soon due to inactivity unless you continue using the software.",
        variant: "destructive",
      });
    }, SESSION_TIMEOUT - WARNING_TIME);

    timeoutRef.current = setTimeout(handleSessionExpiry, SESSION_TIMEOUT);
  }, [updateLastActivity, handleSessionExpiry, toast]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove', 'click'];
    
    // Throttle activity tracking to avoid excessive updates
    let throttleTimeout: NodeJS.Timeout;
    const throttledReset = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          resetTimer();
          throttleTimeout = undefined as unknown as NodeJS.Timeout;
        }, 1000); // Update at most once per second
      }
    };

    // Check for dictation activity
    const checkDictationActivity = () => {
      const dictationButtons = document.querySelectorAll('[data-dictation-active="true"]');
      return dictationButtons.length > 0;
    };

    // Enhanced activity detection including dictation
    const activityInterval = setInterval(() => {
      if (checkDictationActivity()) {
        resetTimer(); // Keep session alive during dictation
      }
    }, 10000); // Check every 10 seconds

    events.forEach(event => {
      document.addEventListener(event, throttledReset);
    });

    // Start heartbeat
    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    
    resetTimer();
    sendHeartbeat(); // Initial heartbeat

    return () => {
      clearInterval(activityInterval);
      events.forEach(event => {
        document.removeEventListener(event, throttledReset);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [resetTimer, sendHeartbeat]);
}

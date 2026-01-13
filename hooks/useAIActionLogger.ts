import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logError } from '@/utils/errorTracking';

interface AIAction {
  id: string;
  timestamp: Date;
  actionType: string;
  description: string;
  success: boolean;
}

export function useAIActionLogger() {
  const [actions, setActions] = useState<AIAction[]>([]);
  const { toast } = useToast();

  const logAction = useCallback(async (
    actionType: string,
    description: string,
    entityType: string,
    entityId: string | null,
    success: boolean = true
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Log to audit_logs table
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: `AI_${actionType}`,
        entity_type: entityType,
        entity_id: entityId,
        success,
        new_values: { description, source: 'ai_assistant' }
      });

      // Add to local state
      const action: AIAction = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        actionType,
        description,
        success
      };

      setActions(prev => [action, ...prev].slice(0, 50)); // Keep last 50 actions

      if (success) {
        toast({
          title: "AI Action Completed",
          description,
        });
      }
    } catch (error) {
      await logError(error instanceof Error ? error : new Error(String(error)), '/assistant');
    }
  }, [toast]);

  return { actions, logAction };
}

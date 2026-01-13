import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileUp, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss: () => void;
  onSkip?: () => void;
}

export function MigrationDialog({ open, onOpenChange, onDismiss, onSkip }: MigrationDialogProps) {
  const navigate = useNavigate();

  useEffect(() => {
    // Track that migration dialog was shown
    const checkFirstTime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && open) {
        const stored = localStorage.getItem(`migration_first_shown_${user.id}`);
        if (!stored) {
          localStorage.setItem(`migration_first_shown_${user.id}`, new Date().toISOString());
        }
      }
    };
    checkFirstTime();
  }, [open]);

  const logMigrationInteraction = async (action: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: `MIGRATION_${action}`,
          entity_type: 'migration_assistant',
          entity_id: null,
          success: true,
          new_values: { timestamp: new Date().toISOString() }
        });
      }
    } catch (error) {
      console.error("Error logging migration interaction:", error);
    }
  };

  const handleStartMigration = async () => {
    await logMigrationInteraction('STARTED');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('user_onboarding').upsert({
          user_id: user.id,
          migration_first_shown_at: new Date().toISOString(),
          migration_completed: true
        });
        localStorage.setItem(`migration_completed_${user.id}`, 'true');
        localStorage.setItem(`migration_dismissed_${user.id}`, 'true');
      }
    } catch (error) {
      console.error("Error starting migration:", error);
    }
    onDismiss();
    navigate("/assistant?migration=true");
  };

  const handleSkip = async () => {
    await logMigrationInteraction('SKIPPED');
    // Call onSkip to create notification instead of dismissing permanently
    if (onSkip) {
      onSkip();
    }
    onOpenChange(false);
  };

  const handlePermanentDismiss = async () => {
    await logMigrationInteraction('PERMANENTLY_DISMISSED');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Mark as permanently dismissed
        await supabase.from('user_onboarding').upsert({
          user_id: user.id,
          migration_dismissed: true,
          migration_last_dismissed_at: new Date().toISOString()
        });
        
        // Remove all migration notifications
        await supabase
          .from('notifications')
          .delete()
          .eq('user_id', user.id)
          .eq('type', 'migration');
        
        localStorage.setItem(`migration_dismissed_${user.id}`, 'true');
      }
    } catch (error) {
      console.error("Error permanently dismissing migration:", error);
    }
    onDismiss();
    onOpenChange(false);
  };

  const handleClose = async () => {
    await logMigrationInteraction('CLOSED_WITH_X');
    // Create notification when X is pressed
    if (onSkip) {
      onSkip();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl border-2">
        <div className="space-y-4 p-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileUp className="w-6 h-6 text-primary" />
              Welcome to Mindful AI Pro!
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <p className="text-base">
                Switching from another platform? Our AI Migration Assistant can help you seamlessly transfer:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm pl-2">
                <li>Client profiles and information</li>
                <li>SOAP notes and session records</li>
                <li>Appointments and schedules</li>
                <li>Documents and files</li>
              </ul>
              <p className="text-sm font-medium pt-2">
                The AI will guide you through the process and organize everything automatically.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-3 pt-4">
            <Button variant="outline" onClick={handleSkip} className="w-full sm:w-auto">
              Skip for Now
            </Button>
            <Button onClick={handleStartMigration} className="w-full sm:w-auto">
              Start Migration Assistant
            </Button>
            <Button 
              variant="destructive" 
              onClick={handlePermanentDismiss} 
              className="w-full sm:w-auto"
            >
              I Do Not Need Help
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

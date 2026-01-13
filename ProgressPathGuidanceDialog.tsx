import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Target } from "lucide-react";

interface ProgressPathGuidanceDialogProps {
  userType: 'professional' | 'client';
  onDismiss: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ProgressPathGuidanceDialog({ userType, onDismiss, open: controlledOpen, onOpenChange }: ProgressPathGuidanceDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  useEffect(() => {
    // Only check storage if not controlled externally
    if (controlledOpen === undefined) {
      const storageKey = `progress_path_guidance_${userType}_visited`;
      const hasVisited = localStorage.getItem(storageKey);
      
      // Only show on first visit
      if (!hasVisited) {
        setInternalOpen(true);
        localStorage.setItem(storageKey, 'true');
      }
    }
  }, [userType, controlledOpen]);

  const handleDismiss = () => {
    setOpen(false);
    onDismiss();
  };

  const professionalMessage = {
    title: "Progress Path Best Practice",
    description: "Focus on one progress path at a time with each client. This helps them stay on track and achieve meaningful outcomes. Multiple concurrent paths can dilute focus and reduce effectiveness.",
  };

  const clientMessage = {
    title: "Your Progress Journey",
    description: "Focus on completing your current path before starting a new one. Completing one path is just the beginning of your growth journey. Each completed path builds a foundation for the next.",
  };

  const message = userType === 'professional' ? professionalMessage : clientMessage;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Target className="w-6 h-6 text-primary" />
          </div>
          <AlertDialogTitle className="text-center">{message.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {message.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleDismiss} className="w-full">
            Got it
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

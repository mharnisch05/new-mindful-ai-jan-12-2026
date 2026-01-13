import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, FileText, AlertCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface ReminderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder: {
    id: string;
    title: string;
    description: string | null;
    reminder_date: string;
    priority: string;
    created_at: string;
  } | null;
  onDelete?: () => void;
}

export function ReminderDetailDialog({ open, onOpenChange, reminder, onDelete }: ReminderDetailDialogProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);
  
  if (!reminder) return null;

  const priorityColors = {
    low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("reminders")
        .delete()
        .eq("id", reminder.id);

      if (error) throw error;

      toast({
        title: "Reminder deleted",
        description: "The reminder has been permanently removed",
      });
      
      onOpenChange(false);
      if (onDelete) onDelete();
    } catch (error: any) {
      console.error("Error deleting reminder:", error);
      toast({
        title: "Delete failed",
        description: error.message || "Could not delete reminder",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Reminder Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Title */}
          <div>
            <h3 className="font-semibold text-lg mb-2">{reminder.title}</h3>
          </div>

          {/* Priority */}
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Priority:</span>
            <Badge className={priorityColors[reminder.priority as keyof typeof priorityColors] || priorityColors.medium}>
              {reminder.priority.charAt(0).toUpperCase() + reminder.priority.slice(1)}
            </Badge>
          </div>

          {/* Due Date & Time */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Due Date:</span>
              <span className="text-sm font-medium">
                {format(new Date(reminder.reminder_date), "MMMM d, yyyy")}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Due Time:</span>
              <span className="text-sm font-medium">
                {format(new Date(reminder.reminder_date), "h:mm a")}
              </span>
            </div>
          </div>

          {/* Description */}
          {reminder.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Notes:</span>
              </div>
              <p className="text-sm pl-6 whitespace-pre-wrap">{reminder.description}</p>
            </div>
          )}

          {/* Created Date */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Created on {format(new Date(reminder.created_at), "MMMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Close
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              "Deleting..."
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Reminder
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

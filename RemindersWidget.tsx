import { memo, useState } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { ReminderDetailDialog } from "@/components/dialogs/ReminderDetailDialog";
import { CreateReminderDialog } from "@/components/dialogs/CreateReminderDialog";

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  reminder_date: string;
  priority: string;
  created_at: string;
}

interface RemindersWidgetProps {
  reminders: Reminder[];
  loading: boolean;
  onMarkComplete: (id: string) => void;
}

export const RemindersWidget = memo(({ reminders, loading, onMarkComplete }: RemindersWidgetProps) => {
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleReminderClick = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    setDetailDialogOpen(true);
  };

  const isOverdue = (reminderDate: string) => {
    return new Date(reminderDate) < new Date();
  };
  return (
    <>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Active Reminders</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-accent/10 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : reminders.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 border-2 rounded-lg">
            No active reminders
          </p>
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder) => {
              const overdueStatus = isOverdue(reminder.reminder_date);
              return (
                <div 
                  key={reminder.id} 
                  className={`flex items-start gap-3 p-4 border-2 rounded-lg hover:bg-accent/5 transition-colors cursor-pointer ${
                    overdueStatus ? 'border-destructive' : ''
                  }`}
                  onClick={() => handleReminderClick(reminder)}
                >
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => onMarkComplete(reminder.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${overdueStatus ? 'text-destructive' : ''}`}>
                      {reminder.title}
                    </p>
                    {reminder.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{reminder.description}</p>
                    )}
                    <p className={`text-xs mt-1 ${overdueStatus ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      {overdueStatus && '⚠️ OVERDUE: '}
                      {new Date(reminder.reminder_date).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <ReminderDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        reminder={selectedReminder}
        onDelete={() => {
          setDetailDialogOpen(false);
          setSelectedReminder(null);
          // Trigger refresh via parent callback
          onMarkComplete("");
        }}
      />
      <CreateReminderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={() => {
          setCreateDialogOpen(false);
          onMarkComplete("");
        }}
      />
    </>
  );
});

RemindersWidget.displayName = "RemindersWidget";

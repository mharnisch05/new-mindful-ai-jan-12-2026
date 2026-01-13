import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, FileText, Repeat } from "lucide-react";
import { format } from "date-fns";

interface AppointmentViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: any;
  onEdit: () => void;
  onDelete: () => void;
  onViewRecurring?: () => void;
}

export function AppointmentViewDialog({ 
  open, 
  onOpenChange, 
  appointment, 
  onEdit, 
  onDelete,
  onViewRecurring 
}: AppointmentViewDialogProps) {
  if (!appointment) return null;

  const appointmentDate = new Date(appointment.appointment_date);
  const clientName = appointment.clients 
    ? `${appointment.clients.first_name} ${appointment.clients.last_name}`
    : "Unknown Client";
  const isRecurring = !!appointment.parent_appointment_id || !!appointment.recurrence_rule;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Appointment Details</span>
            {isRecurring && onViewRecurring && (
              <Button variant="outline" size="sm" onClick={onViewRecurring}>
                <Repeat className="h-4 w-4 mr-2" />
                Recurring
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>View appointment information</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Client</p>
              <p className="text-sm text-muted-foreground">{clientName}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Date</p>
              <p className="text-sm text-muted-foreground">
                {format(appointmentDate, "EEEE, MMMM d, yyyy")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Time</p>
              <p className="text-sm text-muted-foreground">
                {format(appointmentDate, "h:mm a")} ({appointment.duration_minutes || 60} minutes)
              </p>
            </div>
          </div>

          {appointment.notes && (
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Notes</p>
                <p className="text-sm text-muted-foreground">{appointment.notes}</p>
              </div>
            </div>
          )}

          {appointment.status && (
            <div className="flex items-start gap-3">
              <div className="h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Status</p>
                <p className="text-sm text-muted-foreground capitalize">{appointment.status}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="destructive" onClick={onDelete}>
            Delete
          </Button>
          <Button onClick={onEdit}>
            Edit Appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

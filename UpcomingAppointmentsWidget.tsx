import { memo } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Appointment {
  id: string;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  clients: {
    first_name: string;
    last_name: string;
  };
}

interface UpcomingAppointmentsWidgetProps {
  appointments: Appointment[];
  loading: boolean;
  onScheduleNew: () => void;
}

export const UpcomingAppointmentsWidget = memo(({ appointments, loading, onScheduleNew }: UpcomingAppointmentsWidgetProps) => {
  const navigate = useNavigate();

  const handleAppointmentClick = (appointmentId: string) => {
    navigate(`/appointments?id=${appointmentId}`);
  };

  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Upcoming Appointments</CardTitle>
        {appointments.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/appointments')}
          >
            View All
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-accent/10 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-8 border-2 rounded-lg">
            <p className="text-muted-foreground mb-4">No upcoming appointments</p>
            <Button onClick={onScheduleNew}>Schedule Appointment</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => (
              <div 
                key={apt.id} 
                className="p-4 border-2 rounded-lg hover:bg-accent/5 transition-colors cursor-pointer"
                onClick={() => handleAppointmentClick(apt.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold">
                      {apt.clients?.first_name} {apt.clients?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(apt.appointment_date).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{apt.duration_minutes}m</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </>
  );
});

UpcomingAppointmentsWidget.displayName = "UpcomingAppointmentsWidget";

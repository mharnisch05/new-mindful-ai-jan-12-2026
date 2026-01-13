import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppointmentRequestDialog } from "@/components/client/AppointmentRequestDialog";

interface ClientAppointmentsProps {
  clientId: string;
  therapistId: string;
}

export function ClientAppointments({ clientId, therapistId }: ClientAppointmentsProps) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, [clientId]);

  const loadAppointments = async () => {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("client_id", clientId)
      .eq("therapist_id", therapistId)
      .gte("appointment_date", new Date().toISOString())
      .order("appointment_date", { ascending: true });

    if (error) {
      console.error("Error loading appointments:", error);
    } else {
      setAppointments(data || []);
    }
    setLoading(false);
  };

  if (loading) {
    return <Card><CardContent className="py-8"><p className="text-center text-muted-foreground">Loading appointments...</p></CardContent></Card>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Upcoming Appointments</CardTitle>
            <Button size="sm" onClick={() => setRequestDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Request Appointment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
        {appointments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No upcoming appointments</p>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => (
              <div key={apt.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">
                      {new Date(apt.appointment_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(apt.appointment_date).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' '} • {apt.duration_minutes} minutes
                    </p>
                    {apt.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{apt.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    <AppointmentRequestDialog
      open={requestDialogOpen}
      onOpenChange={setRequestDialogOpen}
      clientId={clientId}
      therapistId={therapistId}
    />
  </>
  );
}
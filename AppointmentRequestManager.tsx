import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle, XCircle, Calendar } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";

export function AppointmentRequestManager() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<any>(null);
  const [therapistNote, setTherapistNote] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();

    // Real-time subscription
    const channel = supabase
      .channel('appointment-requests')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointment_requests'
      }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("appointment_requests")
        .select("*, clients(first_name, last_name)")
        .eq("therapist_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (requestId: string, status: 'approved' | 'denied') => {
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) return;

      const { error: updateError } = await supabase
        .from("appointment_requests")
        .update({
          status,
          therapist_note: therapistNote.trim() || null,
          responded_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // If approved, create the appointment
      if (status === 'approved') {
        const { error: aptError } = await supabase
          .from("appointments")
          .insert({
            therapist_id: request.therapist_id,
            client_id: request.client_id,
            appointment_date: request.requested_date,
            duration_minutes: request.duration_minutes,
            notes: request.notes,
            status: 'scheduled',
          });

        if (aptError) throw aptError;
      }

      // Notify client
      const { data: clientUser } = await supabase
        .from("client_users")
        .select("user_id")
        .eq("client_id", request.client_id)
        .single();

      if (clientUser) {
        await supabase.from("notifications").insert({
          user_id: clientUser.user_id,
          title: `Appointment Request ${status === 'approved' ? 'Approved' : 'Declined'}`,
          message: therapistNote.trim() || `Your appointment request has been ${status}`,
          type: status === 'approved' ? 'success' : 'warning',
          link: '/client-portal?tab=appointments',
        });
      }

      toast({ 
        title: status === 'approved' ? "Request Approved" : "Request Declined",
        description: "Client has been notified"
      });

      setRespondingTo(null);
      setTherapistNote("");
      fetchRequests();
    } catch (error) {
      console.error("Error responding to request:", error);
      toast({ title: "Failed to process request", variant: "destructive" });
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const respondedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Pending Requests ({pendingRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : pendingRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No pending requests</p>
          ) : (
            pendingRequests.map((request) => (
              <Card key={request.id} className="border-l-4 border-l-primary">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{request.clients.first_name} {request.clients.last_name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(request.requested_date).toLocaleDateString()} at{' '}
                        {new Date(request.requested_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-sm text-muted-foreground">Duration: {request.duration_minutes} minutes</p>
                      {request.notes && (
                        <p className="text-sm mt-2 p-2 bg-muted rounded">{request.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setRespondingTo({ ...request, action: 'approved' })}>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRespondingTo({ ...request, action: 'denied' })}>
                        <XCircle className="w-4 h-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {respondedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Responses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {respondedRequests.slice(0, 5).map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">{request.clients.first_name} {request.clients.last_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(request.requested_date).toLocaleDateString()} 
                  </p>
                </div>
                <Badge variant={request.status === 'approved' ? 'default' : 'secondary'}>
                  {request.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Response Dialog */}
      <AlertDialog open={!!respondingTo} onOpenChange={() => setRespondingTo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {respondingTo?.action === 'approved' ? 'Approve Request' : 'Decline Request'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {respondingTo?.action === 'approved'
                ? 'This will create a scheduled appointment with the client.'
                : 'The client will be notified of your decision.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="therapist-note">Add a note to the client (optional)</Label>
            <Textarea
              id="therapist-note"
              value={therapistNote}
              onChange={(e) => setTherapistNote(e.target.value)}
              placeholder={respondingTo?.action === 'approved' 
                ? "Confirmed for the requested time. Looking forward to seeing you!"
                : "Could we schedule for 2 PM instead? Let me know what works for you."}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setRespondingTo(null);
              setTherapistNote("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleResponse(respondingTo.id, respondingTo.action)}>
              {respondingTo?.action === 'approved' ? 'Approve & Schedule' : 'Decline Request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Edit, Trash2, Calendar, FileText, DollarSign, TrendingUp, UserPlus, FileUp, CheckCircle, X } from "lucide-react";
import { z } from "zod";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgressPathView } from "@/components/progress/ProgressPathView";
import { InviteClientDialog } from "@/components/dialogs/InviteClientDialog";
import { ClientDocuments } from "@/components/client/ClientDocuments";
import { ClientContacts } from "@/components/client/ClientContacts";
import { Switch } from "@/components/ui/switch";
import { AppointmentViewDialog } from "@/components/dialogs/AppointmentViewDialog";
import { format } from "date-fns";

const clientSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().min(1, "Phone is required").max(20),
  address: z.string().trim().min(1, "Address is required").max(500),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  gender_pronouns: z.string().trim().min(1, "Gender/Pronouns is required").max(100),
  emergency_contact: z.string().trim().min(1, "Emergency contact is required").max(200),
  emergency_phone: z.string().trim().min(1, "Emergency phone is required").max(20),
  insurance_provider: z.string().trim().max(200).optional().or(z.literal("")),
  insurance_policy_number: z.string().trim().max(100).optional().or(z.literal("")),
  insurance_group_number: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  medication_details: z.string().trim().max(5000).optional().or(z.literal("")),
  release_of_information: z.boolean(),
});

import { sanitizeForDisplay } from "@/utils/dataValidation";
import { handleError } from "@/utils/errorTracking";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["clients"]["Row"];
type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
type SoapNote = Database["public"]["Tables"]["soap_notes"]["Row"];
type Invoice = Database["public"]["Tables"]["invoices"]["Row"];

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [client, setClient] = useState<Client | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notes, setNotes] = useState<SoapNote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [appointmentViewOpen, setAppointmentViewOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    date_of_birth: "",
    gender_pronouns: "",
    emergency_contact: "",
    emergency_phone: "",
    insurance_provider: "",
    insurance_policy_number: "",
    insurance_group_number: "",
    notes: "",
    release_of_information: false,
    medication_details: "",
  });

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const fetchClientData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !id) return;

    const [clientRes, appointmentsRes, notesRes, invoicesRes] = await Promise.all([
      supabase.from("clients").select("*").eq("id", id).eq("therapist_id", user.id).single(),
      supabase.from("appointments").select("*").eq("client_id", id).eq("therapist_id", user.id).gte("appointment_date", new Date().toISOString()).order("appointment_date", { ascending: true }).limit(5),
      supabase.from("soap_notes").select("*").eq("client_id", id).eq("therapist_id", user.id).order("created_at", { ascending: false }),
      supabase.from("invoices").select("*").eq("client_id", id).eq("therapist_id", user.id).order("created_at", { ascending: false }),
    ]);

    if (clientRes.error) {
      toast({ title: "Error loading client", variant: "destructive" });
      navigate("/clients");
    } else {
      setClient(clientRes.data);
      setFormData({
        first_name: clientRes.data.first_name,
        last_name: clientRes.data.last_name,
        email: clientRes.data.email || "",
        phone: clientRes.data.phone || "",
        address: clientRes.data.address || "",
        date_of_birth: clientRes.data.date_of_birth || "",
        gender_pronouns: clientRes.data.gender_pronouns || "",
        emergency_contact: clientRes.data.emergency_contact || "",
        emergency_phone: clientRes.data.emergency_phone || "",
        insurance_provider: clientRes.data.insurance_provider || "",
        insurance_policy_number: clientRes.data.insurance_policy_number || "",
        insurance_group_number: clientRes.data.insurance_group_number || "",
        notes: clientRes.data.notes || "",
        release_of_information: clientRes.data.release_of_information || false,
        medication_details: clientRes.data.medication_details || "",
      });
    }

    setAppointments(appointmentsRes.data || []);
    setNotes(notesRes.data || []);
    setInvoices(invoicesRes.data || []);
    setLoading(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = clientSchema.safeParse(formData);
    if (!validation.success) {
      toast({ title: validation.error.errors[0].message, variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("clients")
      .update({
        first_name: validation.data.first_name,
        last_name: validation.data.last_name,
        email: validation.data.email,
        phone: validation.data.phone,
        address: validation.data.address,
        date_of_birth: validation.data.date_of_birth,
        gender_pronouns: validation.data.gender_pronouns,
        emergency_contact: validation.data.emergency_contact,
        emergency_phone: validation.data.emergency_phone,
        insurance_provider: validation.data.insurance_provider || null,
        insurance_policy_number: validation.data.insurance_policy_number || null,
        insurance_group_number: validation.data.insurance_group_number || null,
        notes: validation.data.notes || null,
        medication_details: validation.data.medication_details || null,
        release_of_information: validation.data.release_of_information,
      })
      .eq("id", id);

    if (error) {
      toast({ title: "Error updating client", variant: "destructive" });
    } else {
      toast({ title: "Client updated successfully" });
      setEditDialogOpen(false);
      fetchClientData();
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("clients").delete().eq("id", id);

    if (error) {
      toast({ title: "Error deleting client", variant: "destructive" });
    } else {
      toast({ title: "Client deleted successfully" });
      navigate("/clients");
    }
  };

  if (loading) return <div className="container mx-auto p-6">Loading...</div>;
  if (!client) return <div className="container mx-auto p-6">Client not found</div>;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate("/clients")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Clients
        </Button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{client.first_name} {client.last_name}</h1>
            <p className="text-muted-foreground">{client.email}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setInviteDialogOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite to Portal
            </Button>
            <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="progress">
            <TrendingUp className="w-4 h-4 mr-2" />
            Progress
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileUp className="w-4 h-4 mr-2" />
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{client.email || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{client.phone || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium">{client.address || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <p className="font-medium">{client.date_of_birth ? format(new Date(client.date_of_birth), "PPP") : "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gender/Pronouns</p>
              <p className="font-medium">{client.gender_pronouns || "Not provided"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Contact</p>
              <p className="font-medium">{client.emergency_contact || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{client.emergency_phone || "Not provided"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Insurance Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Provider</p>
              <p className="font-medium">{client.insurance_provider || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Policy Number</p>
              <p className="font-medium">{client.insurance_policy_number || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Group Number</p>
              <p className="font-medium">{client.insurance_group_number || "Not provided"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{sanitizeForDisplay(client.medication_details, "No medications recorded")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Release of Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-medium">{client.release_of_information ? "Yes" : "No"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{sanitizeForDisplay(client.notes, "No notes added")}</p>
            </CardContent>
      </Card>

      <ClientContacts clientId={id!} />

      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/appointments?client=${client.id}`)}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Appointments</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Click to view all</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/notes?client=${client.id}`)}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">SOAP Notes</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Click to view all</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/billing?client=${client.id}`)}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Invoices</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Click to view all</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Upcoming Appointments</CardTitle>
            <Button size="sm" variant="outline" onClick={() => navigate(`/appointments?client=${client.id}`)}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <p className="text-muted-foreground text-sm">No upcoming appointments</p>
            ) : (
              <div className="space-y-2">
                {appointments.map((apt) => (
                  <div 
                    key={apt.id} 
                    className="flex justify-between items-center p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => navigate(`/appointments?id=${apt.id}`)}
                  >
                    <div>
                      <p className="font-medium">{new Date(apt.appointment_date).toLocaleDateString()} at {new Date(apt.appointment_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      <p className="text-sm text-muted-foreground">{apt.status}</p>
                      {apt.notes && <p className="text-sm text-muted-foreground mt-1">{apt.notes}</p>}
                    </div>
                    <span className="text-sm">{apt.duration_minutes} min</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>SOAP Notes</CardTitle>
            <Button size="sm" variant="outline" onClick={() => navigate(`/notes?client=${client.id}`)}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {notes.length === 0 ? (
              <p className="text-muted-foreground text-sm">No SOAP notes created</p>
            ) : (
              <div className="space-y-4">
                {notes.slice(0, 5).map((note) => (
                  <div key={note.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-sm">{new Date(note.created_at).toLocaleDateString()} at {new Date(note.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/notes?edit=${note.id}`)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                    {note.subjective && note.subjective.trim().length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Subjective:</p>
                        <p className="text-sm whitespace-pre-wrap">{note.subjective}</p>
                      </div>
                    )}
                    {note.objective && note.objective.trim().length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Objective:</p>
                        <p className="text-sm whitespace-pre-wrap">{note.objective}</p>
                      </div>
                    )}
                    {note.assessment && note.assessment.trim().length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Assessment:</p>
                        <p className="text-sm whitespace-pre-wrap">{note.assessment}</p>
                      </div>
                    )}
                    {note.plan && note.plan.trim().length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Plan:</p>
                        <p className="text-sm whitespace-pre-wrap">{note.plan}</p>
                      </div>
                    )}
                    {(!note.subjective || note.subjective.trim().length === 0) &&
                     (!note.objective || note.objective.trim().length === 0) &&
                     (!note.assessment || note.assessment.trim().length === 0) &&
                     (!note.plan || note.plan.trim().length === 0) && (
                      <p className="text-sm text-muted-foreground italic">No content available</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-muted-foreground text-sm">No invoices created</p>
            ) : (
              <div className="space-y-2">
                {invoices.slice(0, 5).map((inv) => (
                  <div key={inv.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{inv.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">{inv.status}</p>
                    </div>
                    <span className="font-bold">${parseFloat(inv.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="progress">
          <ProgressPathView clientId={id!} clientName={`${client.first_name} ${client.last_name}`} />
        </TabsContent>

        <TabsContent value="documents">
          <ClientDocuments clientId={id!} therapistId={client.therapist_id} isTherapist={true} />
        </TabsContent>
      </Tabs>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>Update client information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="max-h-[70vh] overflow-y-auto">
            <div className="space-y-4 pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    maxLength={100}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    maxLength={100}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  maxLength={255}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  maxLength={20}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  maxLength={500}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender_pronouns">Gender/Pronouns</Label>
                <Input
                  id="gender_pronouns"
                  value={formData.gender_pronouns}
                  onChange={(e) => setFormData({ ...formData, gender_pronouns: e.target.value })}
                  maxLength={100}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_contact">Emergency Contact</Label>
                <Input
                  id="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  maxLength={200}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_phone">Emergency Phone</Label>
                <Input
                  id="emergency_phone"
                  value={formData.emergency_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                  maxLength={20}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insurance_provider">Insurance Provider</Label>
                <Input
                  id="insurance_provider"
                  value={formData.insurance_provider}
                  onChange={(e) => setFormData({ ...formData, insurance_provider: e.target.value })}
                  maxLength={200}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="insurance_policy_number">Policy Number</Label>
                  <Input
                    id="insurance_policy_number"
                    value={formData.insurance_policy_number}
                    onChange={(e) => setFormData({ ...formData, insurance_policy_number: e.target.value })}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insurance_group_number">Group Number</Label>
                  <Input
                    id="insurance_group_number"
                    value={formData.insurance_group_number}
                    onChange={(e) => setFormData({ ...formData, insurance_group_number: e.target.value })}
                    maxLength={100}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  maxLength={5000}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medication_details">Medications + Amounts</Label>
                <Textarea
                  id="medication_details"
                  value={formData.medication_details}
                  onChange={(e) => setFormData({ ...formData, medication_details: e.target.value })}
                  placeholder="List medications and dosages..."
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="release_of_information"
                  checked={formData.release_of_information}
                  onCheckedChange={(checked) => setFormData({ ...formData, release_of_information: checked })}
                />
                <Label htmlFor="release_of_information" className="cursor-pointer">
                  Release of Information
                </Label>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {client.first_name} {client.last_name}? This action cannot be undone and will also delete all associated appointments, notes, and invoices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InviteClientDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        clientId={client.id}
        clientName={`${client.first_name} ${client.last_name}`}
        clientEmail={client.email}
      />

      <AppointmentViewDialog
        open={appointmentViewOpen}
        onOpenChange={setAppointmentViewOpen}
        appointment={selectedAppointment}
        onEdit={() => {
          setAppointmentViewOpen(false);
          navigate(`/appointments?edit=${selectedAppointment?.id}`);
        }}
        onDelete={async () => {
          if (!selectedAppointment) return;
          const { error } = await supabase
            .from('appointments')
            .delete()
            .eq('id', selectedAppointment.id);
          if (!error) {
            toast({ title: "Appointment deleted" });
            setAppointmentViewOpen(false);
            fetchClientData();
          }
        }}
      />
    </div>
  );
}

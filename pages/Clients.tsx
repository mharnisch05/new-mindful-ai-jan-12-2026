import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, AlertCircle } from "lucide-react";
import { z } from "zod";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { handleError } from "@/utils/errorTracking";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["clients"]["Row"];

const clientSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100, "First name must be less than 100 characters"),
  last_name: z.string().trim().min(1, "Last name is required").max(100, "Last name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  phone: z.string().trim().min(1, "Phone is required").max(20, "Phone must be less than 20 characters"),
  address: z.string().trim().min(1, "Address is required").max(500, "Address must be less than 500 characters"),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  gender_pronouns: z.string().trim().min(1, "Gender/Pronouns is required").max(100),
  emergency_contact: z.string().trim().min(1, "Emergency contact is required").max(200),
  emergency_phone: z.string().trim().min(1, "Emergency phone is required").max(20),
  insurance_provider: z.string().trim().max(200).optional().or(z.literal("")),
  insurance_policy_number: z.string().trim().max(100).optional().or(z.literal("")),
  insurance_group_number: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(5000, "Notes must be less than 5000 characters").optional().or(z.literal("")),
});

export default function Clients() {
  const { features } = useSubscription();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
  });
  const { toast } = useToast();

  const CLIENT_LIMIT = features.unlimited_clients ? Infinity : 10;

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Authentication required", description: "Please log in to view clients", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("therapist_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      await handleError(error, '/clients', toast);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check client limit
    if (!features.unlimited_clients && clients.length >= CLIENT_LIMIT) {
      toast({ 
        title: "Client limit reached", 
        description: "Upgrade to Solo for unlimited clients",
        variant: "destructive" 
      });
      return;
    }
    
    // Validate form data
    const validation = clientSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({ title: firstError.message, variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("clients").insert({
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
      therapist_id: user.id,
    });

    if (error) {
      await handleError(error, '/clients', toast);
    } else {
      toast({ title: "Client added successfully" });
      setIsDialogOpen(false);
      setFormData({ 
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
        notes: "" 
      });
      fetchClients();
    }
  };

  const filteredClients = clients.filter((client) =>
    `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground">
            Manage your client roster
            {!features.unlimited_clients && (
              <span className="ml-2 text-xs">({clients.length}/{CLIENT_LIMIT} clients)</span>
            )}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!features.unlimited_clients && clients.length >= CLIENT_LIMIT}>
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>Enter the client's information below</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto">
              <div className="space-y-4 pr-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      maxLength={100}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name *</Label>
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
                  <Label htmlFor="email">Email *</Label>
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
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    maxLength={20}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    maxLength={500}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth *</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender_pronouns">Gender/Pronouns *</Label>
                  <Input
                    id="gender_pronouns"
                    value={formData.gender_pronouns}
                    onChange={(e) => setFormData({ ...formData, gender_pronouns: e.target.value })}
                    placeholder="e.g., She/Her, He/Him, They/Them"
                    maxLength={100}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact">Emergency Contact *</Label>
                  <Input
                    id="emergency_contact"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                    placeholder="Name and relationship"
                    maxLength={200}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_phone">Emergency Phone *</Label>
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
                    placeholder="Optional"
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
                      placeholder="Optional"
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insurance_group_number">Group Number</Label>
                    <Input
                      id="insurance_group_number"
                      value={formData.insurance_group_number}
                      onChange={(e) => setFormData({ ...formData, insurance_group_number: e.target.value })}
                      placeholder="Optional"
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
                    placeholder="Add any notes about this client..."
                    maxLength={5000}
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit">Add Client</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!features.unlimited_clients && clients.length >= CLIENT_LIMIT && (
        <Alert className="mb-6 border-primary/50 bg-primary/10">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertDescription className="flex items-center justify-between">
            <span>You've reached the 10 client limit. Upgrade for unlimited clients.</span>
            <Button variant="outline" size="sm" onClick={() => navigate("/pricing")}>
              Upgrade to Solo
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading clients...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <Plus className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">No clients yet</h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  {searchTerm 
                    ? "No clients match your search. Try a different search term."
                    : "Get started by adding your first client to begin managing your practice."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card 
              key={client.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/clients/${client.id}`)}
            >
              <CardHeader>
                <CardTitle>{client.first_name} {client.last_name}</CardTitle>
                <CardDescription>
                  {client.email && <span className="block">{client.email}</span>}
                  {client.phone && <span className="block">{client.phone}</span>}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
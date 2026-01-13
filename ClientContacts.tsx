import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, User } from "lucide-react";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  role: z.string().trim().min(1, "Role is required").max(100),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
});

interface ClientContactsProps {
  clientId: string;
}

export function ClientContacts({ clientId }: ClientContactsProps) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    phone: "",
    email: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchContacts();
  }, [clientId]);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast({ title: "Error loading contacts", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = contactSchema.safeParse(formData);
    if (!validation.success) {
      toast({ title: validation.error.errors[0].message, variant: "destructive" });
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from("client_contacts")
          .update({
            name: validation.data.name,
            role: validation.data.role,
            phone: validation.data.phone || null,
            email: validation.data.email || null,
          })
          .eq("id", editingId);

        if (error) throw error;
        toast({ title: "Contact updated successfully" });
      } else {
        const { error } = await supabase
          .from("client_contacts")
          .insert({
            client_id: clientId,
            name: validation.data.name,
            role: validation.data.role,
            phone: validation.data.phone || null,
            email: validation.data.email || null,
          });

        if (error) throw error;
        toast({ title: "Contact added successfully" });
      }

      setDialogOpen(false);
      setEditingId(null);
      setFormData({ name: "", role: "", phone: "", email: "" });
      fetchContacts();
    } catch (error) {
      console.error("Error saving contact:", error);
      toast({ title: "Error saving contact", variant: "destructive" });
    }
  };

  const handleEdit = (contact: any) => {
    setEditingId(contact.id);
    setFormData({
      name: contact.name,
      role: contact.role,
      phone: contact.phone || "",
      email: contact.email || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("client_contacts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Contact deleted successfully" });
      fetchContacts();
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast({ title: "Error deleting contact", variant: "destructive" });
    }
  };

  const openAddDialog = () => {
    setEditingId(null);
    setFormData({ name: "", role: "", phone: "", email: "" });
    setDialogOpen(true);
  };

  if (loading) {
    return <div className="text-center py-4">Loading contacts...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle>Related Professionals & Contacts</CardTitle>
        <Button size="sm" onClick={openAddDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No contacts added yet</p>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-start justify-between p-3 border rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">{contact.role}</p>
                    {contact.phone && <p className="text-sm">{contact.phone}</p>}
                    {contact.email && <p className="text-sm">{contact.email}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(contact)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(contact.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Contact" : "Add Contact"}</DialogTitle>
            <DialogDescription>
              Add related professionals or caregivers (e.g., psychiatrist, care manager)
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  maxLength={200}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g., Psychiatrist, Care Manager"
                  maxLength={100}
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  maxLength={255}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="submit">{editingId ? "Update" : "Add"} Contact</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
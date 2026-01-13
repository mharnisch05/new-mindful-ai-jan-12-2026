import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { ClientSearchSelect } from "./ClientSearchSelect";

const invoiceSchema = z.object({
  client_id: z.string().uuid("Please select a client"),
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Amount must be greater than 0"),
  due_date: z.string().min(1, "Due date is required"),
  notes: z.string().trim().max(5000, "Notes must be less than 5000 characters").optional().or(z.literal("")),
});

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  invoice?: any;
}

export function InvoiceDialog({ open, onOpenChange, onSuccess, invoice }: InvoiceDialogProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    client_id: "",
    amount: "",
    due_date: "",
    notes: "",
    status: "pending",
  });
  const { toast } = useToast();
  const isEditing = !!invoice;

  useEffect(() => {
    if (open) {
      fetchClients();
      if (invoice) {
        setFormData({
          client_id: invoice.client_id,
          amount: invoice.amount.toString(),
          due_date: invoice.due_date,
          notes: invoice.notes || "",
          status: invoice.status || "pending",
        });
      } else {
        setFormData({ client_id: "", amount: "", due_date: "", notes: "", status: "pending" });
      }
    }
  }, [open, invoice]);

  const fetchClients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("clients")
      .select("id, first_name, last_name")
      .eq("therapist_id", user.id);
    
    setClients(data || []);
  };

  const generateInvoiceNumber = () => {
    const date = new Date();
    return `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const validation = invoiceSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({ title: firstError.message, variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let error;
    if (isEditing) {
      const result = await supabase.from("invoices").update({
        client_id: validation.data.client_id,
        amount: parseFloat(validation.data.amount),
        due_date: validation.data.due_date,
        notes: validation.data.notes || null,
        status: formData.status,
      }).eq("id", invoice.id);
      error = result.error;
    } else {
      const result = await supabase.from("invoices").insert({
        client_id: validation.data.client_id,
        therapist_id: user.id,
        invoice_number: generateInvoiceNumber(),
        amount: parseFloat(validation.data.amount),
        due_date: validation.data.due_date,
        notes: validation.data.notes || null,
        status: formData.status,
      });
      error = result.error;
    }

    if (error) {
      console.error("Invoice error:", error);
      toast({ 
        title: `Error ${isEditing ? 'updating' : 'creating'} invoice`,
        description: error.message || "Please check your input and try again.",
        variant: "destructive" 
      });
      return;
    } else {
      // Send notification to client
      const { data: clientUser } = await supabase
        .from("client_users")
        .select("user_id")
        .eq("client_id", validation.data.client_id)
        .maybeSingle();

      if (clientUser) {
        await supabase.from("notifications").insert({
          user_id: clientUser.user_id,
          title: `Invoice ${isEditing ? 'Updated' : 'Created'}`,
          message: `You have a ${isEditing ? 'updated' : 'new'} invoice for $${validation.data.amount}`,
          link: "/client-portal",
        });
      }

      toast({ title: `Invoice ${isEditing ? 'updated' : 'created'} successfully` });
      onOpenChange(false);
      setFormData({ client_id: "", amount: "", due_date: "", notes: "", status: "pending" });
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Invoice' : 'Create Invoice'}</DialogTitle>
          <DialogDescription>{isEditing ? 'Update invoice details' : 'Generate a new invoice for a client'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <ClientSearchSelect
                clients={clients}
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                placeholder="Select a client"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="150.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
            </div>
            {isEditing && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Session details, payment terms..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                maxLength={5000}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="submit">{isEditing ? 'Save Changes' : 'Create Invoice'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

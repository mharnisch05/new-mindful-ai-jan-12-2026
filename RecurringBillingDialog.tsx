import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ClientSearchSelect } from "./ClientSearchSelect";

interface RecurringBillingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  billing?: any;
}

export function RecurringBillingDialog({ open, onOpenChange, onSuccess, billing }: RecurringBillingDialogProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [syncWithAppointments, setSyncWithAppointments] = useState(false);
  const [formData, setFormData] = useState({
    client_id: "",
    amount: "",
    frequency: "monthly",
    next_billing_date: "",
    description: "",
    active: true,
  });
  const { toast } = useToast();
  const isEditing = !!billing;

  useEffect(() => {
    if (open) {
      fetchClients();
      if (billing) {
        setFormData({
          client_id: billing.client_id,
          amount: billing.amount.toString(),
          frequency: billing.frequency,
          next_billing_date: billing.next_billing_date,
          description: billing.description || "",
          active: billing.active,
        });
      } else {
        // Default to first of next month
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1);
        setFormData({ 
          client_id: "", 
          amount: "", 
          frequency: "monthly", 
          next_billing_date: nextMonth.toISOString().split('T')[0], 
          description: "",
          active: true 
        });
      }
    }
  }, [open, billing]);

  const fetchClients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("clients")
      .select("id, first_name, last_name")
      .eq("therapist_id", user.id);
    
    setClients(data || []);
  };

  const handleClientChange = async (clientId: string) => {
    setFormData({ ...formData, client_id: clientId });
    
    if (syncWithAppointments && clientId) {
      // Fetch client's appointment pattern
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: appointments } = await supabase
        .from('appointments')
        .select('appointment_date')
        .eq('client_id', clientId)
        .eq('therapist_id', user.id)
        .gte('appointment_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('appointment_date', { ascending: false })
        .limit(10);

      if (appointments && appointments.length >= 2) {
        // Calculate average days between appointments
        const dates = appointments.map(a => new Date(a.appointment_date).getTime());
        dates.sort((a, b) => a - b);
        const gaps = [];
        for (let i = 1; i < dates.length; i++) {
          gaps.push((dates[i] - dates[i-1]) / (1000 * 60 * 60 * 24));
        }
        const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

        // Determine frequency based on average gap
        let frequency = 'monthly';
        if (avgGap <= 8) frequency = 'weekly';
        else if (avgGap <= 16) frequency = 'biweekly';
        else if (avgGap <= 60) frequency = 'monthly';

        setFormData(prev => ({ ...prev, frequency }));
        toast({ title: `Auto-detected ${frequency} billing based on appointment pattern` });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.amount || !formData.next_billing_date) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let error;
    if (isEditing) {
      const result = await supabase.from("recurring_billing").update({
        client_id: formData.client_id,
        amount: parseFloat(formData.amount),
        frequency: formData.frequency,
        next_billing_date: formData.next_billing_date,
        description: formData.description || null,
        active: formData.active,
      }).eq("id", billing.id);
      error = result.error;
    } else {
      const result = await supabase.from("recurring_billing").insert({
        therapist_id: user.id,
        client_id: formData.client_id,
        amount: parseFloat(formData.amount),
        frequency: formData.frequency,
        next_billing_date: formData.next_billing_date,
        description: formData.description || null,
        active: formData.active,
      });
      error = result.error;
    }

    if (error) {
      toast({ 
        title: `Error ${isEditing ? 'updating' : 'creating'} recurring billing`,
        description: error.message,
        variant: "destructive" 
      });
      return;
    }

    toast({ title: `Recurring billing ${isEditing ? 'updated' : 'created'} successfully` });
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Recurring Billing' : 'Create Recurring Billing'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update recurring billing details' : 'Set up automatic recurring invoices for a client'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="checkbox"
                id="sync-appointments"
                checked={syncWithAppointments}
                onChange={(e) => setSyncWithAppointments(e.target.checked)}
                className="w-4 h-4 rounded border-input"
              />
              <Label htmlFor="sync-appointments" className="text-sm font-normal cursor-pointer">
                Auto-detect frequency from appointment schedule
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <ClientSearchSelect
                clients={clients}
                value={formData.client_id}
                onValueChange={handleClientChange}
                placeholder="Select a client"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($) *</Label>
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
              <Label htmlFor="frequency">Billing Frequency *</Label>
              <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="next_billing_date">Next Billing Date *</Label>
              <Input
                id="next_billing_date"
                type="date"
                value={formData.next_billing_date}
                onChange={(e) => setFormData({ ...formData, next_billing_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Monthly therapy sessions..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            {isEditing && (
              <div className="space-y-2">
                <Label htmlFor="active">Status</Label>
                <Select value={formData.active.toString()} onValueChange={(value) => setFormData({ ...formData, active: value === 'true' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter className="mt-6">
            <Button type="submit">{isEditing ? 'Save Changes' : 'Create Recurring Billing'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

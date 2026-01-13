import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { InvoiceDialog } from "@/components/dialogs/InvoiceDialog";
import { RecurringBillingDialog } from "@/components/dialogs/RecurringBillingDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DollarSign, FileText, TrendingUp, Edit, Trash2, Plus, CreditCard, Repeat } from "lucide-react";
import { cacheGet, cacheSet, cacheClear } from "@/utils/cache";
import { useDemoGuard } from "@/hooks/useDemoGuard";
import { handleError } from "@/utils/errorTracking";
import type { Database } from "@/integrations/supabase/types";

type Invoice = Database["public"]["Tables"]["invoices"]["Row"] & {
  clients: {
    first_name: string;
    last_name: string;
  } | null;
};

type RecurringBilling = Database["public"]["Tables"]["recurring_billing"]["Row"] & {
  clients: {
    first_name: string;
    last_name: string;
  } | null;
};

type Payment = Database["public"]["Tables"]["payments"]["Row"];

export default function Billing() {
  const { shouldBlock } = useDemoGuard();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [recurringBilling, setRecurringBilling] = useState<RecurringBilling[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedRecurring, setSelectedRecurring] = useState<RecurringBilling | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvoices();
    fetchRecurringBilling();
    fetchPayments();
    
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'create') {
      setDialogOpen(true);
    }
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Try to get from cache first
      const cached = await cacheGet<Invoice[]>('invoices');
      if (cached) {
        setInvoices(cached);
        setLoading(false);
        // Fetch fresh data in background
        fetchInvoicesFresh();
        return;
      }

      // Fetch fresh data
      await fetchInvoicesFresh();
    } catch (error) {
      await handleError(error, '/billing', toast);
      setLoading(false);
    }
  };

  const fetchInvoicesFresh = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("invoices")
      .select(`
        *,
        clients!invoices_client_id_fkey (
          first_name,
          last_name
        )
      `)
      .eq("therapist_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    const invoiceData = data || [];
    setInvoices(invoiceData);
    
    // Cache the data for 5 minutes
    await cacheSet('invoices', invoiceData, 5);
    setLoading(false);
  };

  const fetchRecurringBilling = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("recurring_billing")
        .select(`
          *,
          clients (
            first_name,
            last_name
          )
        `)
        .eq("therapist_id", user.id)
        .order("next_billing_date", { ascending: true });

      if (error) throw error;
      setRecurringBilling(data || []);
    } catch (error) {
      await handleError(error, '/billing', toast);
    }
  };

  const fetchPayments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          invoices (
            invoice_number
          ),
          clients (
            first_name,
            last_name
          )
        `)
        .eq("therapist_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      await handleError(error, '/billing', toast);
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDialogOpen(true);
  };

  const handleEditRecurring = (recurring: RecurringBilling) => {
    setSelectedRecurring(recurring);
    setRecurringDialogOpen(true);
  };

  const handlePayInvoice = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-invoice-payment', {
        body: { invoice_id: invoiceId }
      });

      if (error) throw error;
      
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      await handleError(error, '/billing', toast);
    }
  };

  const handleDelete = async () => {
    if (!invoiceToDelete) return;

    try {
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoiceToDelete);

      if (error) throw error;

      // Clear cache after modification
      await cacheClear('invoices');
      
      toast({ title: "Invoice deleted successfully" });
      fetchInvoices();
    } catch (error) {
      await handleError(error, '/billing', toast);
    } finally {
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      paid: "default",
      overdue: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading billing information...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPending = invoices
    .filter((inv) => inv.status === "pending")
    .reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

  const totalPaid = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold">Billing</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            setSelectedRecurring(null);
            setRecurringDialogOpen(true);
          }}>
            <Repeat className="mr-2 h-4 w-4" />
            Recurring Billing
          </Button>
          <Button onClick={() => {
            setSelectedInvoice(null);
            setDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPending.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {invoices.filter((inv) => inv.status === "pending").length} invoice(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPaid.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {invoices.filter((inv) => inv.status === "paid").length} invoice(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalPending + totalPaid).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>Manage your client invoices</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No invoices yet. Create your first invoice to get started.</p>
              ) : (
                <div className="space-y-4">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="space-y-1">
                        <p className="font-medium">
                          {invoice.clients?.first_name} {invoice.clients?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Invoice #{invoice.invoice_number} • Due {new Date(invoice.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-lg">${invoice.amount}</p>
                          {getStatusBadge(invoice.status)}
                        </div>
                        <div className="flex gap-2">
                          {invoice.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePayInvoice(invoice.id)}
                            >
                              <CreditCard className="mr-2 h-4 w-4" />
                              Pay
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(invoice)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setInvoiceToDelete(invoice.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recurring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recurring Billing</CardTitle>
              <CardDescription>Automatic invoice generation</CardDescription>
            </CardHeader>
            <CardContent>
              {recurringBilling.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No recurring billing set up yet.</p>
              ) : (
                <div className="space-y-4">
                  {recurringBilling.map((recurring) => (
                    <div key={recurring.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="space-y-1">
                        <p className="font-medium">
                          {recurring.clients?.first_name} {recurring.clients?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {recurring.frequency} • Next: {new Date(recurring.next_billing_date).toLocaleDateString()}
                        </p>
                        {recurring.description && (
                          <p className="text-sm text-muted-foreground">{recurring.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-lg">${recurring.amount}</p>
                          <Badge variant={recurring.active ? "default" : "secondary"}>
                            {recurring.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditRecurring(recurring)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Track all payments received</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No payments recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">
                          {payment.clients?.first_name} {payment.clients?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Invoice #{payment.invoices?.invoice_number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {payment.paid_at ? new Date(payment.paid_at).toLocaleDateString() : 'Pending'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">${payment.amount}</p>
                        {getStatusBadge(payment.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <InvoiceDialog
        open={dialogOpen}
        onOpenChange={async (open) => {
          setDialogOpen(open);
          if (!open) {
            setSelectedInvoice(null);
            // Clear cache when dialog closes after save
            await cacheClear('invoices');
            fetchInvoices();
          }
        }}
        onSuccess={async () => {
          await cacheClear('invoices');
          fetchInvoices();
        }}
        invoice={selectedInvoice}
      />

      <RecurringBillingDialog
        open={recurringDialogOpen}
        onOpenChange={(open) => {
          setRecurringDialogOpen(open);
          if (!open) setSelectedRecurring(null);
        }}
        onSuccess={fetchRecurringBilling}
        billing={selectedRecurring}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
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
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import jsPDF from "jspdf";
import { PaymentModal } from "./PaymentModal";

interface ClientBillingProps {
  clientId: string;
}

export function ClientBilling({ clientId }: ClientBillingProps) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadInvoices();
  }, [clientId, retryCount]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[BILLING] Error loading invoices:", error);
        throw new Error(error.message || "Failed to load invoices");
      }

      setInvoices(data || []);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unable to load your invoices";
      console.error("[BILLING] Invoice loading error:", err);
      setError(errorMessage);
      toast({ 
        title: "Unable to load invoices", 
        description: "There was a problem loading your billing information. Please try again.",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "default";
      case "pending":
        return "secondary";
      case "overdue":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const handlePayInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    setPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    loadInvoices();
  };
  const handleDownloadInvoice = async (invoice: any) => {
    try {
      // Get client and professional details
      const { data: clientData } = await supabase
        .from("clients")
        .select("*, therapist_id")
        .eq("id", clientId)
        .single();

      if (!clientData) throw new Error("Client data not found");

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", clientData.therapist_id)
        .single();

      const { data: practiceSettings } = await supabase
        .from("practice_settings")
        .select("practice_name, logo_url")
        .eq("therapist_id", clientData.therapist_id)
        .maybeSingle();

      // Generate enhanced PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 20;

      // Header with border
      doc.setDrawColor(59, 130, 246); // primary color
      doc.setLineWidth(0.5);
      doc.rect(10, 10, pageWidth - 20, 40);

      // Practice name/logo
      doc.setFontSize(22);
      doc.setFont(undefined, "bold");
      doc.text(practiceSettings?.practice_name || profileData?.full_name || "Professional Practice", pageWidth / 2, yPos, { align: "center" });
      
      yPos += 10;
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(profileData?.email || "", pageWidth / 2, yPos, { align: "center" });
      
      yPos = 65;
      
      // Invoice title
      doc.setFontSize(24);
      doc.setFont(undefined, "bold");
      doc.text("INVOICE", pageWidth / 2, yPos, { align: "center" });
      
      yPos += 20;
      
      // Invoice details section
      doc.setFillColor(245, 247, 250);
      doc.rect(10, yPos - 5, pageWidth - 20, 35, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(10, yPos - 5, pageWidth - 20, 35);
      
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text("Invoice Number:", 15, yPos);
      doc.setFont(undefined, "normal");
      doc.text(`#${invoice.invoice_number}`, 70, yPos);
      
      yPos += 8;
      doc.setFont(undefined, "bold");
      doc.text("Issue Date:", 15, yPos);
      doc.setFont(undefined, "normal");
      doc.text(new Date(invoice.issue_date).toLocaleDateString(), 70, yPos);
      
      yPos += 8;
      if (invoice.due_date) {
        doc.setFont(undefined, "bold");
        doc.text("Due Date:", 15, yPos);
        doc.setFont(undefined, "normal");
        doc.text(new Date(invoice.due_date).toLocaleDateString(), 70, yPos);
        yPos += 8;
      }
      
      doc.setFont(undefined, "bold");
      doc.text("Status:", 15, yPos);
      doc.setFont(undefined, "normal");
      const statusColor: [number, number, number] = invoice.status === "paid" ? [34, 197, 94] : invoice.status === "overdue" ? [239, 68, 68] : [156, 163, 175];
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.text(invoice.status.toUpperCase(), 70, yPos);
      doc.setTextColor(0, 0, 0);
      
      yPos += 20;
      
      // Billing details
      doc.setFont(undefined, "bold");
      doc.setFontSize(12);
      doc.text("Bill To:", 15, yPos);
      yPos += 8;
      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      doc.text(`${clientData.first_name} ${clientData.last_name}`, 15, yPos);
      if (clientData.email) {
        yPos += 6;
        doc.text(clientData.email, 15, yPos);
      }
      
      yPos += 15;
      
      // Amount section with highlight
      doc.setFillColor(59, 130, 246);
      doc.rect(10, yPos - 5, pageWidth - 20, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      doc.text("Amount Due:", 15, yPos + 7);
      doc.text(`$${parseFloat(invoice.amount).toFixed(2)}`, pageWidth - 15, yPos + 7, { align: "right" });
      doc.setTextColor(0, 0, 0);
      
      yPos += 30;
      
      // Notes section
      if (invoice.notes) {
        doc.setFont(undefined, "bold");
        doc.setFontSize(11);
        doc.text("Notes:", 15, yPos);
        yPos += 8;
        doc.setFont(undefined, "normal");
        doc.setFontSize(10);
        const splitNotes = doc.splitTextToSize(invoice.notes, pageWidth - 30);
        doc.text(splitNotes, 15, yPos);
        yPos += (splitNotes.length * 5);
      }
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text("Thank you for your business!", pageWidth / 2, pageHeight - 20, { align: "center" });
      
      // Save PDF
      doc.save(`invoice-${invoice.invoice_number}.pdf`);
      
      toast({
        title: "Invoice downloaded",
        description: "Your invoice has been downloaded successfully",
      });
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast({
        title: "Download failed",
        description: "Unable to download invoice. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="ml-3 text-muted-foreground">Loading invoices...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8 space-y-4">
            <div className="text-destructive">
              <svg className="w-12 h-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-semibold mb-2">Unable to Load Invoices</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We encountered a problem loading your billing information. This could be due to a temporary connection issue.
              </p>
            </div>
            <Button onClick={handleRetry} variant="default">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Billing & Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No invoices yet</p>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">Invoice #{invoice.invoice_number}</p>
                      <Badge variant={getStatusColor(invoice.status)}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Issued {formatDistanceToNow(new Date(invoice.issue_date), { addSuffix: true })}
                    </p>
                    {invoice.due_date && (
                      <p className="text-sm text-muted-foreground">
                        Due: {new Date(invoice.due_date).toLocaleDateString()}
                      </p>
                    )}
                    {invoice.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{invoice.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold">${invoice.amount}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownloadInvoice(invoice)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    {(invoice.status === "pending" || invoice.status === "overdue") && (
                      <Button 
                        size="sm"
                        onClick={() => handlePayInvoice(invoice)}
                      >
                        Pay Now
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedInvoice && (
        <PaymentModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          invoice={selectedInvoice}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}

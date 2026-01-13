import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ClientSearchSelect } from "./ClientSearchSelect";
import { jsPDF } from "jspdf";
import { Download, Eye } from "lucide-react";

interface ExportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section?: 'soapNotes' | 'billing' | 'clients' | 'all';
}

export function ExportDataDialog({ open, onOpenChange, section = 'all' }: ExportDataDialogProps) {
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [clients, setClients] = useState<any[]>([]);
  const [exportAll, setExportAll] = useState(true);
  const [selectedDatasets, setSelectedDatasets] = useState({
    profile: section === 'all' || section === 'clients',
    appointments: section === 'all',
    billing: section === 'all' || section === 'billing',
    messages: section === 'all',
    progressPath: section === 'all',
    soapNotes: section === 'all' || section === 'soapNotes',
  });
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const fetchClients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("clients")
      .select("id, first_name, last_name")
      .eq("therapist_id", user.id);
    
    setClients(data || []);
  };

  const handleExport = async (view: boolean = false) => {
    setExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const clientId = exportAll ? null : selectedClient;
      const datasets = Object.entries(selectedDatasets)
        .filter(([_, enabled]) => enabled)
        .map(([key]) => key);

      if (datasets.length === 0) {
        toast({ title: "Please select at least one dataset", variant: "destructive" });
        setExporting(false);
        return;
      }

      // Pre-fetch all data in parallel for better performance
      const dataPromises = datasets.map(dataset => fetchDataForDataset(dataset, clientId, user.id));
      const allData = await Promise.all(dataPromises);

      if (view) {
        // For view mode, open data in a new window
        const viewWindow = window.open('', '_blank');
        if (viewWindow) {
          let htmlContent = `
            <!DOCTYPE html>
            <html>
              <head>
                <title>Data Export Preview</title>
                <style>
                  body { font-family: Arial, sans-serif; padding: 20px; max-width: 1200px; margin: 0 auto; }
                  h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
                  h2 { color: #666; margin-top: 30px; }
                  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                  th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                  th { background-color: #f5f5f5; font-weight: bold; }
                  tr:nth-child(even) { background-color: #f9f9f9; }
                  .no-data { color: #999; font-style: italic; }
                </style>
              </head>
              <body>
                <h1>Data Export Preview</h1>
          `;

          datasets.forEach((dataset, index) => {
            const data = allData[index];
            htmlContent += formatDataForView(dataset, data);
          });

          htmlContent += '</body></html>';
          viewWindow.document.write(htmlContent);
          viewWindow.document.close();
        } else {
          toast({ title: "Unable to open preview", description: "Please allow pop-ups", variant: "destructive" });
        }
      } else {
        // For download mode, generate and download PDFs
        for (let i = 0; i < datasets.length; i++) {
          await generatePDF(datasets[i], allData[i], false);
          // Small delay between downloads to prevent browser blocking
          if (i < datasets.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        toast({ title: "Export completed successfully" });
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Export error:", error);
      toast({ title: "Export failed", description: "Please try again", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const formatDataForView = (dataset: string, data: any) => {
    const dataArray = data?.data || [];
    const datasetTitles: Record<string, string> = {
      profile: "Client Profiles",
      appointments: "Appointments",
      billing: "Invoices",
      messages: "Messages",
      progressPath: "Progress Paths",
      soapNotes: "SOAP Notes"
    };

    let html = `<h2>${datasetTitles[dataset] || dataset}</h2>`;
    
    if (dataArray.length === 0) {
      html += '<p class="no-data">No data available</p>';
      return html;
    }

    // Create table with data
    const keys = Object.keys(dataArray[0]).filter(key => 
      !key.includes('_id') && key !== 'id' && key !== 'created_at' && key !== 'updated_at'
    );
    
    html += '<table><thead><tr>';
    keys.forEach(key => {
      html += `<th>${key.replace(/_/g, ' ').toUpperCase()}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    dataArray.forEach(item => {
      html += '<tr>';
      keys.forEach(key => {
        let value = item[key];
        if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value);
        }
        html += `<td>${value || '-'}</td>`;
      });
      html += '</tr>';
    });
    
    html += '</tbody></table>';
    return html;
  };

  const fetchDataForDataset = async (dataset: string, clientId: string | null, userId: string) => {
    let query;
    
    switch (dataset) {
      case "profile":
        query = supabase.from("clients").select("*").eq("therapist_id", userId);
        if (clientId) query = query.eq("id", clientId);
        return query;
      
      case "appointments":
        query = supabase.from("appointments").select("*, clients!client_id(first_name, last_name)").eq("therapist_id", userId);
        if (clientId) query = query.eq("client_id", clientId);
        return query.order("appointment_date", { ascending: false });
      
      case "billing":
        query = supabase.from("invoices").select("*, clients!client_id(first_name, last_name)").eq("therapist_id", userId);
        if (clientId) query = query.eq("client_id", clientId);
        return query.order("created_at", { ascending: false });
      
      case "messages":
        query = supabase.from("messages").select("*").eq("therapist_id", userId);
        if (clientId) query = query.eq("client_id", clientId);
        return query.order("created_at", { ascending: false });
      
      case "progressPath":
        query = supabase.from("progress_paths").select("*, clients(first_name, last_name)").eq("therapist_id", userId);
        if (clientId) query = query.eq("client_id", clientId);
        return query;
      
      case "soapNotes":
        query = supabase.from("soap_notes").select("*, clients!client_id(first_name, last_name)").eq("therapist_id", userId);
        if (clientId) query = query.eq("client_id", clientId);
        return query.order("created_at", { ascending: false });
      
      default:
        return { data: null, error: null };
    }
  };

  const generatePDF = async (dataset: string, queryResult: any, view: boolean) => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text("Mindful AI - Data Export", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    // Dataset title
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text(formatDatasetName(dataset), 20, yPos);
    yPos += 10;

    // Display data based on dataset
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");

    try {
      const data = queryResult?.data || [];
      if (data.length === 0) {
        pdf.text("No data found", 20, yPos);
      } else {
        switch (dataset) {
          case "profile":
            addProfileDataFromFetch(pdf, yPos, data);
            break;
          case "appointments":
            addAppointmentsDataFromFetch(pdf, yPos, data);
            break;
          case "billing":
            addBillingDataFromFetch(pdf, yPos, data);
            break;
          case "messages":
            addMessagesDataFromFetch(pdf, yPos, data);
            break;
          case "progressPath":
            addProgressPathDataFromFetch(pdf, yPos, data);
            break;
          case "soapNotes":
            addSOAPNotesDataFromFetch(pdf, yPos, data);
            break;
        }
      }
    } catch (error) {
      pdf.text("Error loading data", 20, yPos);
    }

    // Footer
    const totalPages = (pdf as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pdf.internal.pageSize.getHeight() - 10, { align: "center" });
    }

    const fileName = `${formatDatasetName(dataset)}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    if (view) {
      window.open(pdf.output('bloburl'), '_blank');
    } else {
      pdf.save(fileName);
    }
  };

  const formatDatasetName = (dataset: string): string => {
    const names: Record<string, string> = {
      profile: "Client Profile",
      appointments: "Appointments",
      billing: "Billing Information",
      messages: "Messages",
      progressPath: "Progress Path",
      soapNotes: "SOAP Notes",
    };
    return names[dataset] || dataset;
  };

  // Helper functions to add data to PDF (using pre-fetched data)
  const addProfileDataFromFetch = (pdf: jsPDF, yPos: number, data: any[]) => {
    data.forEach((client, index) => {
      if (index > 0) pdf.addPage();
      let y = 40;
      pdf.text(`Name: ${client.first_name} ${client.last_name}`, 20, y);
      y += 7;
      if (client.email) {
        pdf.text(`Email: ${client.email}`, 20, y);
        y += 7;
      }
      if (client.phone) {
        pdf.text(`Phone: ${client.phone}`, 20, y);
        y += 7;
      }
      if (client.notes) {
        pdf.text(`Notes: ${client.notes}`, 20, y, { maxWidth: 170 });
      }
    });
  };

  const addAppointmentsDataFromFetch = (pdf: jsPDF, yPos: number, data: any[]) => {
    let y = 40;
    data.forEach((apt: any) => {
      if (y > 250) {
        pdf.addPage();
        y = 40;
      }
      const date = new Date(apt.appointment_date).toLocaleString();
      const client = apt.clients as any;
      pdf.text(`${date} - ${client?.first_name || ''} ${client?.last_name || ''} (${apt.duration_minutes} min)`, 20, y);
      y += 7;
    });
  };

  const addBillingDataFromFetch = (pdf: jsPDF, yPos: number, data: any[]) => {
    let y = 40;
    data.forEach((inv: any) => {
      if (y > 250) {
        pdf.addPage();
        y = 40;
      }
      const client = inv.clients as any;
      pdf.text(`${inv.invoice_number} - $${inv.amount} - ${inv.status} - ${client?.first_name || ''} ${client?.last_name || ''}`, 20, y);
      y += 7;
    });
  };

  const addMessagesDataFromFetch = (pdf: jsPDF, yPos: number, data: any[]) => {
    let y = 40;
    data.forEach((msg) => {
      if (y > 250) {
        pdf.addPage();
        y = 40;
      }
      const date = new Date(msg.created_at).toLocaleString();
      pdf.text(`${date} - ${msg.sender_type}: ${msg.content.substring(0, 100)}`, 20, y, { maxWidth: 170 });
      y += 10;
    });
  };

  const addProgressPathDataFromFetch = (pdf: jsPDF, yPos: number, data: any[]) => {
    let y = 40;
    for (const path of data) {
      pdf.text(`Client: ${path.clients.first_name} ${path.clients.last_name}`, 20, y);
      y += 7;
      if (path.core_focus) {
        pdf.text(`Focus: ${path.core_focus}`, 20, y, { maxWidth: 170 });
        y += 10;
      }
    }
  };

  const addSOAPNotesDataFromFetch = (pdf: jsPDF, yPos: number, data: any[]) => {
    data.forEach((note: any, index: number) => {
      if (index > 0) pdf.addPage();
      let y = 40;
      const client = note.clients as any;
      pdf.text(`Client: ${client?.first_name || ''} ${client?.last_name || ''}`, 20, y);
      y += 10;
      if (note.subjective) {
        pdf.text("S: " + note.subjective, 20, y, { maxWidth: 170 });
        y += 15;
      }
      if (note.objective) {
        pdf.text("O: " + note.objective, 20, y, { maxWidth: 170 });
        y += 15;
      }
      if (note.assessment) {
        pdf.text("A: " + note.assessment, 20, y, { maxWidth: 170 });
        y += 15;
      }
      if (note.plan) {
        pdf.text("P: " + note.plan, 20, y, { maxWidth: 170 });
      }
    });
  };

  useEffect(() => {
    if (open) {
      fetchClients();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
          <DialogDescription>
            Choose what data to export as professional PDFs
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="export-all"
              checked={exportAll}
              onCheckedChange={(checked) => {
                setExportAll(checked as boolean);
                if (checked) setSelectedClient("");
              }}
            />
            <Label htmlFor="export-all">Export all clients</Label>
          </div>

          {!exportAll && (
            <div className="space-y-2">
              <Label>Select Client</Label>
              <ClientSearchSelect
                clients={clients}
                value={selectedClient}
                onValueChange={setSelectedClient}
                placeholder="Choose a client"
              />
            </div>
          )}

          <div className="space-y-3">
            <Label>Select Datasets</Label>
            {Object.entries(selectedDatasets).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={key}
                  checked={value}
                  onCheckedChange={(checked) =>
                    setSelectedDatasets({ ...selectedDatasets, [key]: checked as boolean })
                  }
                />
                <Label htmlFor={key} className="cursor-pointer">
                  {formatDatasetName(key)}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport(true)}
            disabled={exporting || (!exportAll && !selectedClient)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {exporting ? "Generating..." : "View"}
          </Button>
          <Button
            onClick={() => handleExport(false)}
            disabled={exporting || (!exportAll && !selectedClient)}
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting ? "Generating..." : "Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

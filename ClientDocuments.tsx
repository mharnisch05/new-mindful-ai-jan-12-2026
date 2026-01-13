import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Upload, Trash2 } from "lucide-react";
import { DocumentUploadDialog } from "@/components/dialogs/DocumentUploadDialog";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface ClientDocumentsProps {
  clientId: string;
  therapistId: string;
  isTherapist?: boolean;
}

export function ClientDocuments({ clientId, therapistId, isTherapist = false }: ClientDocumentsProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadDocuments();
  }, [clientId]);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("shared_documents")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Generate signed URLs for secure access (1 hour expiration)
      const docsWithSignedUrls = await Promise.all(
        (data || []).map(async (doc) => {
          try {
            const pathToUse = doc.file_path || doc.file_url?.split('client-documents/')[1];
            if (!pathToUse) return { ...doc, signedUrl: null };

            const { data: urlData, error: urlError } = await supabase.storage
              .from('client-documents')
              .createSignedUrl(pathToUse, 3600);

            if (urlError) {
              console.error("Error creating signed URL:", urlError);
              return { ...doc, signedUrl: null };
            }

            return { ...doc, signedUrl: urlData.signedUrl };
          } catch (err) {
            console.error("Error processing document:", err);
            return { ...doc, signedUrl: null };
          }
        })
      );

      setDocuments(docsWithSignedUrls);
    } catch (error: any) {
      console.error("Error loading documents:", error);
      toast({ title: "Failed to load documents", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Use file_path if available, otherwise extract from legacy file_url
      let filePath = documentToDelete.file_path;
      if (!filePath && documentToDelete.file_url) {
        const urlParts = documentToDelete.file_url.split('/');
        filePath = urlParts.slice(urlParts.indexOf('client-documents') + 1).join('/');
      }

      if (!filePath) throw new Error("Invalid file path");

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('client-documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('shared_documents')
        .delete()
        .eq('id', documentToDelete.id);

      if (dbError) throw dbError;

      toast({ title: "Document deleted successfully" });
      loadDocuments();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({ title: "Failed to delete document", description: error.message, variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType?.includes('pdf')) return '📄';
    if (fileType?.includes('image')) return '🖼️';
    if (fileType?.includes('word')) return '📝';
    return '📎';
  };

  if (loading) {
    return <Card><CardContent className="py-8"><p className="text-center text-muted-foreground">Loading documents...</p></CardContent></Card>;
  }

  return (
    <>
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Shared Documents</CardTitle>
            {isTherapist && (
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {documents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No documents shared yet</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border-2 rounded-lg hover:bg-accent/5 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-2xl flex-shrink-0">{getFileIcon(doc.file_type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.file_name}</p>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{doc.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {doc.file_size && formatFileSize(doc.file_size)} • 
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => doc.signedUrl && window.open(doc.signedUrl, "_blank")}
                      disabled={!doc.signedUrl}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    {isTherapist && (
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => {
                          setDocumentToDelete(doc);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isTherapist && (
        <DocumentUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          clientId={clientId}
          onSuccess={loadDocuments}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.file_name}"? This action cannot be undone.
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
    </>
  );
}
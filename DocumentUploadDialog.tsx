import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onSuccess: () => void;
}

export function DocumentUploadDialog({ open, onOpenChange, clientId, onSuccess }: DocumentUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (selectedFile.size > maxSize) {
        toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
        return;
      }

      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast({ title: "Invalid file type", description: "Please upload PDF, JPG, PNG, DOCX, or TXT files only", variant: "destructive" });
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({ title: "No file selected", variant: "destructive" });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const filePath = `${user.id}/${clientId}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadError) throw uploadError;

      // Store file path instead of public URL for security
      const { error: dbError } = await supabase
        .from('shared_documents')
        .insert({
          therapist_id: user.id,
          client_id: clientId,
          file_name: file.name,
          file_path: filePath,
          file_url: null,
          file_type: file.type,
          file_size: file.size,
          description: description || null,
          uploaded_by: 'therapist'
        });

      if (dbError) throw dbError;

      // Log PHI access for HIPAA compliance
      await supabase.from('phi_access_log').insert({
        user_id: user.id,
        access_type: 'UPLOAD',
        entity_type: 'shared_documents',
        entity_id: null,
        client_id: clientId,
        justification: 'Document upload',
        accessed_fields: { file_name: file.name, file_type: file.type, file_size: file.size }
      });

      // Log audit trail
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'DOCUMENT_UPLOAD',
        entity_type: 'shared_documents',
        entity_id: null,
        success: true,
        new_values: { client_id: clientId, file_name: file.name, encrypted: true }
      });

      // Send notification to client
      const { data: clientUser } = await supabase
        .from('client_users')
        .select('user_id')
        .eq('client_id', clientId)
        .single();

      if (clientUser) {
        await supabase.functions.invoke('send-notification', {
          body: {
            userId: clientUser.user_id,
            title: 'New Document Shared',
            message: `Your therapist shared a new document: ${file.name}`,
            type: 'info',
            link: '/client-portal?tab=documents'
          }
        });
      }

      toast({ title: "Document uploaded successfully" });
      setFile(null);
      setDescription("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Share a document with your client (PDF, JPG, PNG, DOCX, TXT - Max 10MB)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Select File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png,.docx,.txt"
                disabled={uploading}
              />
              {file && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFile(null)}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a brief description..."
              rows={3}
              disabled={uploading}
              maxLength={500}
            />
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-sm text-center text-muted-foreground">Uploading... {uploadProgress}%</p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!file || uploading}>
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
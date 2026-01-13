import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Edit, Trash2, History, FileType, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NoteVersionHistory } from "@/components/notes/NoteVersionHistory";
import { SoapNoteDialog } from "@/components/dialogs/SoapNoteDialog";
import { NoteTemplateDialog } from "@/components/dialogs/NoteTemplateDialog";
import { TemplateListDialog } from "@/components/dialogs/TemplateListDialog";
import { ExportDataDialog } from "@/components/dialogs/ExportDataDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLocation } from "react-router-dom";
import { defaultSoapTemplates } from "@/data/defaultSoapTemplates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { handleError } from "@/utils/errorTracking";
import type { Database } from "@/integrations/supabase/types";

type SoapNote = Database["public"]["Tables"]["soap_notes"]["Row"] & {
  clients: {
    first_name: string;
    last_name: string;
  } | null;
};

export default function Notes() {
  const [notes, setNotes] = useState<SoapNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<SoapNote | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<SoapNote | null>(null);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [versionHistoryNoteId, setVersionHistoryNoteId] = useState<string>('');
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateListOpen, setTemplateListOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | undefined>();
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [defaultTemplateId, setDefaultTemplateId] = useState<string>("");
  const { toast } = useToast();

  const location = useLocation();

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    if (location.pathname.endsWith("/soap-notes/new")) {
      setDialogOpen(true);
    }
  }, [location]);

  const fetchNotes = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Authentication required", description: "Please log in to view notes", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase
        .from("soap_notes")
        .select(`
          *,
          clients!soap_notes_client_id_fkey (first_name, last_name)
        `)
        .eq("therapist_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      await handleError(error, '/notes', toast);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleEdit = useCallback((note: SoapNote) => {
    setSelectedNote(note);
    setDialogOpen(true);
  }, []);

  const handleDelete = async () => {
    if (!noteToDelete) return;

    const { error } = await supabase
      .from("soap_notes")
      .delete()
      .eq("id", noteToDelete.id);

    if (error) {
      toast({ title: "Error deleting note", variant: "destructive" });
    } else {
      toast({ title: "Note deleted successfully" });
      fetchNotes();
    }
    setDeleteDialogOpen(false);
    setNoteToDelete(null);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedNote(null);
    setSelectedTemplate(null);
    setDefaultTemplateId("");
  };

  const handleDefaultTemplateSelect = (templateId: string) => {
    const template = defaultSoapTemplates.find(t => t.name === templateId);
    if (template) {
      setSelectedTemplate(template);
      setDefaultTemplateId(templateId);
      setDialogOpen(true);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">SOAP Notes</h1>
          <p className="text-muted-foreground">Session documentation</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New SOAP Note
          </Button>
          <Select value={defaultTemplateId} onValueChange={handleDefaultTemplateSelect}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Use Template" />
            </SelectTrigger>
            <SelectContent>
              {defaultSoapTemplates.map((template) => (
                <SelectItem key={template.name} value={template.name}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setTemplateListOpen(true)}>
            <FileType className="w-4 h-4 mr-2" /> My Templates
          </Button>
          <Button variant="outline" onClick={() => setExportDialogOpen(true)}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading notes...</p>
      ) : notes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No SOAP notes yet</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Note
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {notes.map((note) => (
            <Card key={note.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>
                      {note.clients?.first_name} {note.clients?.last_name}
                    </CardTitle>
                    <CardDescription>
                      {new Date(note.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      setVersionHistoryNoteId(note.id);
                      setVersionHistoryOpen(true);
                    }}>
                      <History className="w-4 h-4 mr-2" />
                      History
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(note)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => {
                      setNoteToDelete(note);
                      setDeleteDialogOpen(true);
                    }}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {note.subjective && note.subjective.trim().length > 0 ? (
                    <div>
                      <p className="text-sm font-semibold text-primary">Subjective</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.subjective}</p>
                    </div>
                  ) : null}
                  {note.objective && note.objective.trim().length > 0 ? (
                    <div>
                      <p className="text-sm font-semibold text-primary">Objective</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.objective}</p>
                    </div>
                  ) : null}
                  {note.assessment && note.assessment.trim().length > 0 ? (
                    <div>
                      <p className="text-sm font-semibold text-primary">Assessment</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.assessment}</p>
                    </div>
                  ) : null}
                  {note.plan && note.plan.trim().length > 0 ? (
                    <div>
                      <p className="text-sm font-semibold text-primary">Plan</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.plan}</p>
                    </div>
                  ) : null}
                  {(!note.subjective || note.subjective.trim().length === 0) &&
                   (!note.objective || note.objective.trim().length === 0) &&
                   (!note.assessment || note.assessment.trim().length === 0) &&
                   (!note.plan || note.plan.trim().length === 0) ? (
                    <p className="text-sm text-muted-foreground italic">No content available for this note</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SoapNoteDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onSuccess={fetchNotes}
        note={selectedNote}
        template={selectedTemplate}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete SOAP Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this SOAP note? This action cannot be undone.
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

      <NoteVersionHistory
        noteId={versionHistoryNoteId}
        open={versionHistoryOpen}
        onOpenChange={setVersionHistoryOpen}
      />

      <NoteTemplateDialog
        open={templateDialogOpen}
        onOpenChange={(open) => {
          setTemplateDialogOpen(open);
          if (!open) setEditingTemplateId(undefined);
        }}
        templateId={editingTemplateId}
        onSuccess={() => {
          toast({ title: "Template saved" });
          setTemplateListOpen(true);
        }}
      />

      <TemplateListDialog
        open={templateListOpen}
        onOpenChange={setTemplateListOpen}
        onSelectTemplate={(template) => {
          setSelectedTemplate(template);
          setDialogOpen(true);
        }}
        onEditTemplate={(templateId) => {
          setEditingTemplateId(templateId);
          setTemplateListOpen(false);
          setTemplateDialogOpen(true);
        }}
      />

      <ExportDataDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
      />
    </div>
  );
}

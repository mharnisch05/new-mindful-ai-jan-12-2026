import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Trash2, Edit, Copy } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Template {
  id: string;
  name: string;
  description: string | null;
  subjective_template: string | null;
  objective_template: string | null;
  assessment_template: string | null;
  plan_template: string | null;
  is_default: boolean;
  category: string | null;
}

interface TemplateListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate?: (template: Template) => void;
  onEditTemplate?: (templateId: string) => void;
}

export function TemplateListDialog({ open, onOpenChange, onSelectTemplate, onEditTemplate }: TemplateListDialogProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("note_templates")
        .select("*")
        .eq("therapist_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast.error("Failed to load templates");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;

    try {
      const { error } = await supabase
        .from("note_templates")
        .delete()
        .eq("id", templateToDelete.id);

      if (error) throw error;
      toast.success("Template deleted successfully");
      fetchTemplates();
    } catch (error: any) {
      toast.error("Failed to delete template");
      console.error(error);
    } finally {
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handleDuplicate = async (template: Template) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("note_templates")
        .insert([{
          therapist_id: user.id,
          name: `${template.name} (Copy)`,
          description: template.description,
          subjective_template: template.subjective_template,
          objective_template: template.objective_template,
          assessment_template: template.assessment_template,
          plan_template: template.plan_template,
          category: template.category,
          is_default: false,
        }]);

      if (error) throw error;
      toast.success("Template duplicated successfully");
      fetchTemplates();
    } catch (error: any) {
      toast.error("Failed to duplicate template");
      console.error(error);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>SOAP Note Templates</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[500px] pr-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No templates yet</p>
                <p className="text-sm text-muted-foreground mt-2">Create your first template to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {template.name}
                            {template.is_default && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-normal">
                                Default
                              </span>
                            )}
                          </CardTitle>
                          {template.description && (
                            <CardDescription className="mt-1">{template.description}</CardDescription>
                          )}
                          {template.category && (
                            <span className="text-xs text-muted-foreground mt-2 inline-block">
                              Category: {template.category}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {onSelectTemplate && (
                            <Button
                              size="sm"
                              onClick={() => {
                                onSelectTemplate(template);
                                onOpenChange(false);
                              }}
                            >
                              Use Template
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDuplicate(template)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEditTemplate?.(template.id)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setTemplateToDelete(template);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
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

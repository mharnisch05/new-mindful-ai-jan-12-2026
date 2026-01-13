import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, X } from "lucide-react";

interface CustomTemplateBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  template?: any;
}

interface TemplateField {
  id: string;
  label: string;
  placeholder: string;
}

export function CustomTemplateBuilderDialog({ open, onOpenChange, onSuccess, template }: CustomTemplateBuilderDialogProps) {
  const [templateName, setTemplateName] = useState(template?.name || "");
  const [templateDescription, setTemplateDescription] = useState(template?.description || "");
  const [fields, setFields] = useState<TemplateField[]>(
    template?.fields || [
      { id: crypto.randomUUID(), label: "Subjective", placeholder: "Client's reported symptoms and concerns..." },
      { id: crypto.randomUUID(), label: "Objective", placeholder: "Observable findings and measurements..." },
      { id: crypto.randomUUID(), label: "Assessment", placeholder: "Professional assessment and diagnosis..." },
      { id: crypto.randomUUID(), label: "Plan", placeholder: "Treatment plan and next steps..." },
    ]
  );
  const { toast } = useToast();

  const addField = () => {
    setFields([...fields, { id: crypto.randomUUID(), label: "", placeholder: "" }]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const updateField = (id: string, key: 'label' | 'placeholder', value: string) => {
    setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!templateName.trim()) {
      toast({ title: "Template name is required", variant: "destructive" });
      return;
    }

    if (fields.length === 0) {
      toast({ title: "Add at least one field", variant: "destructive" });
      return;
    }

    const hasEmptyLabels = fields.some(f => !f.label.trim());
    if (hasEmptyLabels) {
      toast({ title: "All fields must have labels", variant: "destructive" });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const templateData = {
        name: templateName,
        description: templateDescription,
        therapist_id: user.id,
        category: 'custom',
        // Store custom fields as JSON in description or create new columns
        subjective_template: fields.find(f => f.label === "Subjective")?.placeholder || "",
        objective_template: fields.find(f => f.label === "Objective")?.placeholder || "",
        assessment_template: fields.find(f => f.label === "Assessment")?.placeholder || "",
        plan_template: fields.find(f => f.label === "Plan")?.placeholder || "",
      };

      if (template?.id) {
        const { error } = await supabase
          .from("note_templates")
          .update(templateData)
          .eq("id", template.id);

        if (error) throw error;
        toast({ title: "Template updated successfully" });
      } else {
        const { error } = await supabase
          .from("note_templates")
          .insert(templateData);

        if (error) throw error;
        toast({ title: "Template created successfully" });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error saving template", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Edit Template" : "Create Custom Note Template"}</DialogTitle>
          <DialogDescription>
            Build a custom template with your own fields and labels
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template_name">Template Name</Label>
            <Input
              id="template_name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Initial Consultation, Progress Note"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template_description">Description (Optional)</Label>
            <Input
              id="template_description"
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="Brief description of when to use this template"
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Template Fields</Label>
              <Button type="button" variant="outline" size="sm" onClick={addField}>
                <Plus className="w-4 h-4 mr-1" />
                Add Field
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Field {index + 1}</span>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeField(field.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Field Label / Question</Label>
                  <Input
                    value={field.label}
                    onChange={(e) => updateField(field.id, 'label', e.target.value)}
                    placeholder="e.g., Subjective, Client Concerns, Treatment Goals"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Placeholder Text (Optional)</Label>
                  <Textarea
                    value={field.placeholder}
                    onChange={(e) => updateField(field.id, 'placeholder', e.target.value)}
                    placeholder="Guiding text shown in the input area..."
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {template ? "Update Template" : "Create Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

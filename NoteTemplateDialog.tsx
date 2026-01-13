import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface NoteTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId?: string;
  onSuccess?: () => void;
}

export function NoteTemplateDialog({ open, onOpenChange, templateId, onSuccess }: NoteTemplateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    subjective_template: "",
    objective_template: "",
    assessment_template: "",
    plan_template: "",
    is_default: false,
  });

  useEffect(() => {
    if (templateId && open) {
      fetchTemplate();
    } else if (!open) {
      resetForm();
    }
  }, [templateId, open]);

  const fetchTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from("note_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          name: data.name,
          description: data.description || "",
          subjective_template: data.subjective_template || "",
          objective_template: data.objective_template || "",
          assessment_template: data.assessment_template || "",
          plan_template: data.plan_template || "",
          is_default: data.is_default || false,
        });
      }
    } catch (error: any) {
      toast.error("Failed to load template");
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      subjective_template: "",
      objective_template: "",
      assessment_template: "",
      plan_template: "",
      is_default: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (templateId) {
        const { error } = await supabase
          .from("note_templates")
          .update(formData)
          .eq("id", templateId);
        if (error) throw error;
        toast.success("Template updated successfully");
      } else {
        const { error } = await supabase
          .from("note_templates")
          .insert([{ ...formData, therapist_id: user.id }]);
        if (error) throw error;
        toast.success("Template created successfully");
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save template");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{templateId ? "Edit" : "Create"} Note Template</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subjective">Subjective Template</Label>
            <Textarea
              id="subjective"
              value={formData.subjective_template}
              onChange={(e) => setFormData({ ...formData, subjective_template: e.target.value })}
              rows={3}
              placeholder="Client reports..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="objective">Objective Template</Label>
            <Textarea
              id="objective"
              value={formData.objective_template}
              onChange={(e) => setFormData({ ...formData, objective_template: e.target.value })}
              rows={3}
              placeholder="Client appears..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assessment">Assessment Template</Label>
            <Textarea
              id="assessment"
              value={formData.assessment_template}
              onChange={(e) => setFormData({ ...formData, assessment_template: e.target.value })}
              rows={3}
              placeholder="Client demonstrates..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan">Plan Template</Label>
            <Textarea
              id="plan"
              value={formData.plan_template}
              onChange={(e) => setFormData({ ...formData, plan_template: e.target.value })}
              rows={3}
              placeholder="Continue with..."
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_default"
              checked={formData.is_default}
              onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
            />
            <Label htmlFor="is_default">Set as default template</Label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

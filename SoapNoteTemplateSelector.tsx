import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus } from "lucide-react";

interface SoapNoteTemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: any[];
  onSelectTemplate: (template: any) => void;
  onCreateNew: () => void;
}

export function SoapNoteTemplateSelector({
  open,
  onOpenChange,
  templates,
  onSelectTemplate,
  onCreateNew
}: SoapNoteTemplateSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Note Template</DialogTitle>
          <DialogDescription>
            Choose a template to create your note or build a custom one
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="grid gap-4 p-4">
            <Card
              className="p-4 cursor-pointer hover:bg-accent transition-colors border-2 border-primary"
              onClick={onCreateNew}
            >
              <div className="flex items-center gap-3">
                <Plus className="w-5 h-5" />
                <div>
                  <h3 className="font-semibold">Create Custom Template</h3>
                  <p className="text-sm text-muted-foreground">Build a template with your own fields</p>
                </div>
              </div>
            </Card>
            {templates.map((template) => (
              <Card
                key={template.id}
                className="p-4 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => {
                  onSelectTemplate(template);
                  onOpenChange(false);
                }}
              >
                <h3 className="font-semibold mb-1">{template.name}</h3>
                {template.description && (
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                )}
                {template.category && (
                  <p className="text-xs text-muted-foreground mt-2 capitalize">
                    Category: {template.category}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

import { ReactNode, useState } from "react";
import { Card } from "@/components/ui/card";
import { X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DashboardWidgetProps {
  id: string;
  children: ReactNode;
  isEditMode: boolean;
  onRemove?: () => void;
  className?: string;
}

export function DashboardWidget({ id, children, isEditMode, onRemove, className }: DashboardWidgetProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    onRemove?.();
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <Card 
        className={`relative transition-all ${
          isEditMode ? 'ring-2 ring-primary/50 cursor-move select-none' : ''
        } ${className || ''}`}
        style={isEditMode ? { userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties : {}}
      >
        {isEditMode && (
          <div className="absolute -top-4 -right-4 z-10">
            <Button
              size="icon"
              variant="destructive"
              className="h-12 w-12 rounded-full shadow-xl hover:scale-105 transition-all touch-manipulation"
              onClick={handleDeleteClick}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        )}
        {isEditMode && (
          <div className="absolute top-4 left-4 z-10 cursor-grab active:cursor-grabbing opacity-60 hover:opacity-100 transition-opacity">
            <GripVertical className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className={isEditMode ? 'pointer-events-none' : ''}>
          {children}
        </div>
      </Card>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this widget?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the widget from your dashboard. You can re-enable it later in Settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

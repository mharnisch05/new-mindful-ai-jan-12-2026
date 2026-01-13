import { useState } from "react";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import { Textarea } from "@/components/ui/textarea";

interface MessageActionsMenuProps {
  messageId: string;
  content: string;
  sentAt: string;
  isSender: boolean;
  onUpdate: () => void;
}

export function MessageActionsMenu({ messageId, content, sentAt, isSender, onUpdate }: MessageActionsMenuProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const { toast } = useToast();

  // Check if message is within 2 minutes of sending (for unsend)
  const sentTime = new Date(sentAt).getTime();
  const now = Date.now();
  const canUnsend = (now - sentTime) < 2 * 60 * 1000; // 2 minutes

  const handleEdit = async () => {
    try {
      const { error } = await supabase
        .from("messages")
        .update({
          content: editedContent,
          original_content: content,
          edited_at: new Date().toISOString(),
        })
        .eq("id", messageId);

      if (error) throw error;

      toast({ title: "Message edited" });
      setEditDialogOpen(false);
      onUpdate();
    } catch (error) {
      console.error("Error editing message:", error);
      toast({ title: "Failed to edit message", variant: "destructive" });
    }
  };

  const handleUnsend = async () => {
    try {
      const { error } = await supabase
        .from("messages")
        .update({
          is_unsent: true,
          content: "[Message unsent]",
        })
        .eq("id", messageId);

      if (error) throw error;

      toast({ title: "Message unsent" });
      setDeleteDialogOpen(false);
      onUpdate();
    } catch (error) {
      console.error("Error unsending message:", error);
      toast({ title: "Failed to unsend message", variant: "destructive" });
    }
  };

  if (!isSender) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreVertical className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Message
          </DropdownMenuItem>
          {canUnsend && (
            <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Unsend Message
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <AlertDialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Message</AlertDialogTitle>
            <AlertDialogDescription>
              Update your message below
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            rows={4}
            className="my-4"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEdit}>Save Changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsend Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsend Message</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the message for both you and the recipient. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnsend} className="bg-destructive text-destructive-foreground">
              Unsend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

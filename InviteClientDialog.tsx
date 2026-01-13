import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
});

interface InviteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  clientEmail?: string;
}

export function InviteClientDialog({ open, onOpenChange, clientId, clientName, clientEmail }: InviteClientDialogProps) {
  const [formData, setFormData] = useState({
    email: clientEmail || "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = inviteSchema.safeParse(formData);
    if (!validation.success) {
      toast({ title: validation.error.errors[0].message, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-client-code", {
        body: { clientId },
      });

      if (error) throw error;

      toast({ 
        title: "Access code generated",
        description: `Code: ${data.code}. It has been created for ${clientName}. Share this with the client so they can enter it at /client-portal-access` ,
      });
      
      onOpenChange(false);
      setFormData({ email: "" });
    } catch (error) {
      console.error("Error inviting client:", error);
      toast({ title: "Failed to send invitation", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite {clientName} to Portal</DialogTitle>
          <DialogDescription>
            Generate a 5-character access code for your client. Share this code with them so they can create their account at /client-portal-access
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Client Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="client@example.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                We'll generate a unique 5-character code for this client.
              </p>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Generating..." : "Generate Access Code"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Clock, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface NoteVersionHistoryProps {
  noteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Version {
  id: string;
  version_number: number;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  edited_at: string;
  edited_by: string;
  change_summary: string;
}

export function NoteVersionHistory({ noteId, open, onOpenChange }: NoteVersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open && noteId) {
      fetchVersions();
    }
  }, [open, noteId]);

  const fetchVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('soap_note_versions')
        .select('*')
        .eq('note_id', noteId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error) {
      console.error('Error fetching versions:', error);
      toast({
        title: "Error loading version history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Note Version History</DialogTitle>
          <DialogDescription>
            View previous versions of this SOAP note for audit compliance
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading versions...</p>
          ) : versions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No previous versions</p>
          ) : (
            <div className="space-y-4">
              {versions.map((version) => (
                <Card key={version.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Version {version.version_number}</Badge>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {new Date(version.edited_at).toLocaleString()}
                          </div>
                        </div>
                        {version.change_summary && (
                          <p className="text-sm text-muted-foreground">{version.change_summary}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 text-sm">
                      {version.subjective && (
                        <div>
                          <p className="font-semibold text-primary">Subjective</p>
                          <p className="text-muted-foreground whitespace-pre-wrap">{version.subjective}</p>
                        </div>
                      )}
                      {version.objective && (
                        <div>
                          <p className="font-semibold text-primary">Objective</p>
                          <p className="text-muted-foreground whitespace-pre-wrap">{version.objective}</p>
                        </div>
                      )}
                      {version.assessment && (
                        <div>
                          <p className="font-semibold text-primary">Assessment</p>
                          <p className="text-muted-foreground whitespace-pre-wrap">{version.assessment}</p>
                        </div>
                      )}
                      {version.plan && (
                        <div>
                          <p className="font-semibold text-primary">Plan</p>
                          <p className="text-muted-foreground whitespace-pre-wrap">{version.plan}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

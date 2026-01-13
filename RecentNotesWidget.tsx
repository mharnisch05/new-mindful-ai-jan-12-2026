import { memo } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Note {
  id: string;
  created_at: string;
  clients: {
    first_name: string;
    last_name: string;
  };
}

export const RecentNotesWidget = memo(() => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentNotes();
  }, []);

  const fetchRecentNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("soap_notes")
        .select(`
          id, created_at,
          clients!soap_notes_client_id_fkey (first_name, last_name)
        `)
        .eq("therapist_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Recent SOAP Notes
          </CardTitle>
          <Button size="sm" onClick={() => navigate("/notes")}>
            <Plus className="w-4 h-4 mr-2" />
            New
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : notes.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground mb-3">
              No notes yet
            </p>
            <Button size="sm" onClick={() => navigate("/notes")}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Note
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => navigate("/notes")}
              >
                <div>
                  <p className="font-medium">
                    {note.clients?.first_name} {note.clients?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(note.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            <Button 
              variant="ghost" 
              className="w-full text-sm"
              onClick={() => navigate("/notes")}
            >
              View All →
            </Button>
          </div>
        )}
      </CardContent>
    </>
  );
});

RecentNotesWidget.displayName = "RecentNotesWidget";

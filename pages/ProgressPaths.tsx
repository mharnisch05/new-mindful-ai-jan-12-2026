import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target, CheckCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProgressPathGuidanceDialog } from "@/components/dialogs/ProgressPathGuidanceDialog";
import { handleError } from "@/utils/errorTracking";
import type { Database } from "@/integrations/supabase/types";

type ProgressPath = Database["public"]["Tables"]["progress_paths"]["Row"] & {
  clients: {
    first_name: string;
    last_name: string;
  } | null;
  totalGoals: number;
  completedGoals: number;
  progress: number;
};

export default function ProgressPaths() {
  const [paths, setPaths] = useState<ProgressPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGuidance, setShowGuidance] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchAllProgressPaths();
    
    // Check if first time visiting Progress Paths
    const hasVisited = localStorage.getItem('progress_paths_visited');
    if (!hasVisited) {
      setShowGuidance(true);
      localStorage.setItem('progress_paths_visited', 'true');
    }
  }, [fetchAllProgressPaths]);

  const fetchAllProgressPaths = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: pathsData, error } = await supabase
        .from("progress_paths")
        .select(`
          id,
          client_id,
          created_at,
          clients!progress_paths_client_id_fkey (first_name, last_name)
        `)
        .eq("therapist_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch goals for each path
      const pathsWithProgress = await Promise.all(
        (pathsData || []).map(async (path) => {
          const { data: goals } = await supabase
            .from("progress_goals")
            .select("id, status")
            .eq("progress_path_id", path.id);

          const totalGoals = goals?.length || 0;
          const completedGoals = goals?.filter((g) => g.status === "completed").length || 0;
          const progress = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

          return {
            ...path,
            totalGoals,
            completedGoals,
            progress,
          };
        })
      );

      setPaths(pathsWithProgress);
    } catch (error) {
      await handleError(error, '/progress-paths', toast);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {showGuidance && (
        <ProgressPathGuidanceDialog 
          userType="professional" 
          onDismiss={() => setShowGuidance(false)} 
        />
      )}
      
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-primary" />
            Progress Paths
          </h1>
          <p className="text-muted-foreground">Track client progress and goals</p>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading progress paths...</p>
          </CardContent>
        </Card>
      ) : paths.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No Progress Paths Yet</h3>
            <p className="text-muted-foreground mb-6">
              Start creating progress paths for your clients to track their goals and milestones
            </p>
            <Button onClick={() => navigate("/clients")}>
              Go to Clients
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {paths.map((path) => (
            <Card
              key={path.id}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
              onClick={() => navigate(`/clients/${path.client_id}`)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>
                    {path.clients?.first_name} {path.clients?.last_name}
                  </span>
                  {path.completedGoals === path.totalGoals && path.totalGoals > 0 && (
                    <CheckCircle className="w-5 h-5 text-primary" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Goals Progress</span>
                    <span className="font-medium">
                      {path.completedGoals}/{path.totalGoals}
                    </span>
                  </div>
                  <Progress value={path.progress} className="h-2" />
                  <div className="text-right">
                    <span className="text-sm font-semibold text-primary">
                      {Math.round(path.progress)}%
                    </span>
                  </div>
                </div>

                {path.completedGoals === path.totalGoals && path.totalGoals > 0 && (
                  <div className="flex items-center gap-2 text-sm text-primary p-2 bg-primary/10 rounded-lg">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">All goals completed!</span>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Created {new Date(path.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

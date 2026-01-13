import { memo } from "react";
import { useState, useEffect } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

export const ProgressPathWidget = memo(() => {
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProgressSummary();
  }, []);

  const fetchProgressSummary = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all progress paths with their goals
      const { data: paths } = await supabase
        .from("progress_paths")
        .select(`
          id,
          client_id,
          clients!progress_paths_client_id_fkey (first_name, last_name)
        `)
        .eq("therapist_id", user.id);

      if (!paths) return;

      // Fetch goals for each path
      const summaryData = await Promise.all(
        paths.slice(0, 5).map(async (path) => {
          const { data: goals } = await supabase
            .from("progress_goals")
            .select("id, status")
            .eq("progress_path_id", path.id);

          const totalGoals = goals?.length || 0;
          const completedGoals = goals?.filter((g) => g.status === "completed").length || 0;
          const progress = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

          return {
            clientId: path.client_id,
            clientName: `${path.clients?.first_name} ${path.clients?.last_name}`,
            totalGoals,
            completedGoals,
            progress,
          };
        })
      );

      setSummary(summaryData);
    } catch (error) {
      console.error("Error fetching progress summary:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Progress Path Overview
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => navigate("/progress-paths")}>
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : summary.length === 0 ? (
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground mb-3">
              No Progress Paths created yet
            </p>
            <Button size="sm" onClick={() => navigate("/clients")}>
              Start First Progress Path
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {summary.map((item, index) => (
              <div
                key={index}
                className="p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/clients/${item.clientId}`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{item.clientName}</p>
                  <span className="text-xs text-muted-foreground">
                    {item.completedGoals}/{item.totalGoals} goals
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{Math.round(item.progress)}%</span>
                  </div>
                  <Progress value={item.progress} className="h-2" />
                </div>
                {item.completedGoals === item.totalGoals && item.totalGoals > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                    <CheckCircle className="w-3 h-3" />
                    <span>All goals completed!</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </>
  );
});

ProgressPathWidget.displayName = "ProgressPathWidget";
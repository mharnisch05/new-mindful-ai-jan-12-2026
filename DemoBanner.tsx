import { useDemoMode } from "@/contexts/DemoModeContext";
import { AlertTriangle } from "lucide-react";

/**
 * Persistent banner displayed when in demo mode.
 * Shows at the top of the page to clearly indicate demo environment.
 */
export function DemoBanner() {
  const { isDemoMode, isLoading } = useDemoMode();

  if (isLoading || !isDemoMode) {
    return null;
  }

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 sticky top-0 z-50">
      <AlertTriangle className="w-4 h-4" />
      <span>Demo Mode — Changes will not be saved</span>
    </div>
  );
}

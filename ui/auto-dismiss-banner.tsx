import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutoDismissBannerProps {
  message: string;
  show: boolean;
  onDismiss: () => void;
  duration?: number;
}

export function AutoDismissBanner({ 
  message, 
  show, 
  onDismiss, 
  duration = 5000 
}: AutoDismissBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Wait for fade out animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onDismiss]);

  if (!show) return null;

  return (
    <div
      className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      )}
    >
      <div className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg shadow-lg border border-primary/20">
        <CheckCircle className="w-5 h-5" />
        <span className="font-medium">{message}</span>
      </div>
    </div>
  );
}

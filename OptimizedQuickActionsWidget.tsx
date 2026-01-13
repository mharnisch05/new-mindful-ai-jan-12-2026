import { memo } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, FileText, MessageSquare, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuickActionsWidgetProps {
  onScheduleAppointment: () => void;
}

export const OptimizedQuickActionsWidget = memo(({ onScheduleAppointment }: QuickActionsWidgetProps) => {
  const navigate = useNavigate();

  return (
    <>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <Button 
            variant="outline" 
            className="w-full justify-start h-auto py-4 flex-col items-start hover:scale-105 transition-transform border-2"
            onClick={() => navigate("/clients")}
          >
            <Users className="w-5 h-5 mb-2" />
            <span className="font-semibold text-wrap-safe">Add Client</span>
            <span className="text-xs text-muted-foreground text-wrap-safe">Create profile</span>
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start h-auto py-4 flex-col items-start hover:scale-105 transition-transform border-2"
            onClick={() => navigate("/appointments")}
          >
            <Calendar className="w-5 h-5 mb-2" />
            <span className="font-semibold text-wrap-safe">New Appointment</span>
            <span className="text-xs text-muted-foreground text-wrap-safe">Book now</span>
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start h-auto py-4 flex-col items-start hover:scale-105 transition-transform border-2"
            onClick={() => navigate("/notes")}
          >
            <FileText className="w-5 h-5 mb-2" />
            <span className="font-semibold text-wrap-safe">Add SOAP Note</span>
            <span className="text-xs text-muted-foreground text-wrap-safe">Document session</span>
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start h-auto py-4 flex-col items-start hover:scale-105 transition-transform border-2"
            onClick={() => navigate("/messages")}
          >
            <MessageSquare className="w-5 h-5 mb-2" />
            <span className="font-semibold text-wrap-safe">Message Client</span>
            <span className="text-xs text-muted-foreground text-wrap-safe">Open inbox</span>
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start h-auto py-4 flex-col items-start hover:scale-105 transition-transform border-2"
            onClick={() => navigate("/billing")}
          >
            <DollarSign className="w-5 h-5 mb-2" />
            <span className="font-semibold text-wrap-safe">Create Invoice</span>
            <span className="text-xs text-muted-foreground text-wrap-safe">New billing</span>
          </Button>
        </div>
      </CardContent>
    </>
  );
});

OptimizedQuickActionsWidget.displayName = "OptimizedQuickActionsWidget";
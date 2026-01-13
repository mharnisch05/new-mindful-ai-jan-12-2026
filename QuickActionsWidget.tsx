import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, FileText, MessageSquare, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuickActionsWidgetProps {
  onScheduleAppointment: () => void;
}

export function QuickActionsWidget({ onScheduleAppointment }: QuickActionsWidgetProps) {
  const navigate = useNavigate();

  return (
    <>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <Button 
            variant="outline" 
            className="w-full justify-start h-auto py-4 flex-col items-start hover:scale-105 transition-transform"
            onClick={() => navigate("/clients")}
          >
            <Users className="w-5 h-5 mb-2" />
            <span className="font-semibold">Add Client</span>
            <span className="text-xs text-muted-foreground">Create new profile</span>
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start h-auto py-4 flex-col items-start hover:scale-105 transition-transform touch-manipulation active:scale-95"
            onClick={onScheduleAppointment}
          >
            <Calendar className="w-5 h-5 mb-2" />
            <span className="font-semibold">New Appointment</span>
            <span className="text-xs text-muted-foreground">Book appointment</span>
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start h-auto py-4 flex-col items-start hover:scale-105 transition-transform touch-manipulation active:scale-95"
            onClick={() => navigate("/notes")}
          >
            <FileText className="w-5 h-5 mb-2" />
            <span className="font-semibold">Add SOAP Note</span>
            <span className="text-xs text-muted-foreground">Create documentation</span>
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start h-auto py-4 flex-col items-start hover:scale-105 transition-transform touch-manipulation active:scale-95"
            onClick={() => navigate("/messages")}
          >
            <MessageSquare className="w-5 h-5 mb-2" />
            <span className="font-semibold">Message Client</span>
            <span className="text-xs text-muted-foreground">Open inbox</span>
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start h-auto py-4 flex-col items-start hover:scale-105 transition-transform touch-manipulation active:scale-95"
            onClick={() => navigate("/billing")}
          >
            <DollarSign className="w-5 h-5 mb-2" />
            <span className="font-semibold">Create Invoice</span>
            <span className="text-xs text-muted-foreground">New billing</span>
          </Button>
        </div>
      </CardContent>
    </>
  );
}

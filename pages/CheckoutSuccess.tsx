import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { handleError } from "@/utils/errorTracking";

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (sessionId) {
      // Give Stripe webhook time to process
      setTimeout(() => {
        toast({
          title: "Subscription Activated!",
          description: "Welcome to the Mindful AI Solo Plan. Your subscription is now active.",
        });
      }, 1000);
    }
  }, [sessionId, toast]);

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      await handleError(error, '/checkout-success', toast);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-lg border-2 border-success/20 shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-success" />
          </div>
          <CardTitle className="text-3xl font-bold">Subscription Successful!</CardTitle>
          <CardDescription className="text-lg">
            Welcome to the Mindful AI Solo Plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="text-center">
              Your subscription to the <span className="font-semibold text-foreground">Mindful AI – Solo Plan</span> has been activated successfully.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="font-medium text-foreground">What's included:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>AI-powered SOAP note assistance</li>
                <li>Secure client portal</li>
                <li>Automated scheduling & reminders</li>
                <li>Invoice management with Stripe</li>
                <li>Voice dictation & transcription</li>
                <li>HIPAA-compliant data storage</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => navigate("/dashboard")}
              className="flex-1"
              size="lg"
            >
              Go to Dashboard
            </Button>
            <Button
              onClick={handleManageBilling}
              variant="outline"
              className="flex-1"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Manage Billing"
              )}
            </Button>
          </div>

          {sessionId && (
            <p className="text-xs text-center text-muted-foreground">
              Session ID: {sessionId.substring(0, 20)}...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

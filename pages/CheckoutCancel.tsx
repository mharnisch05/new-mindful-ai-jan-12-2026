import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";

export default function CheckoutCancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-lg border-2 border-muted shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <XCircle className="w-10 h-10 text-muted-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold">Checkout Canceled</CardTitle>
          <CardDescription className="text-lg">
            Your subscription was not completed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="text-center">
              Looks like you canceled your subscription checkout. Don't worry – you can return anytime to complete your sign-up.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="font-medium text-foreground">Why subscribe to the Solo Plan?</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Save hours each week with AI note assistance</li>
                <li>Streamline your entire practice workflow</li>
                <li>Provide better care with secure client tools</li>
                <li>HIPAA-compliant and therapist-designed</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => navigate("/pricing")}
              className="flex-1"
              size="lg"
            >
              View Pricing Again
            </Button>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { handleError } from "@/utils/errorTracking";

// Mindful AI Solo Plan Price ID
const SOLO_PRICE_ID = "price_1SRjQ1AqpzvXppdtGA1kvoml";

export default function Pricing() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planName: string) => {
    setLoading(planName);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ 
          title: "Sign in required",
          description: "Please sign in to start your subscription"
        });
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          plan: planName,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      await handleError(error, '/pricing', toast);
    } finally {
      setLoading(null);
    }
  };

  const handleContactSales = () => {
    window.location.href = "mailto:founder@usemindful.ai?subject=Enterprise Plan Inquiry";
  };

  const plans = [
    {
      name: "Free",
      price: "$0",
      description: "Perfect for getting started",
      features: [
        "Up to 5 clients",
        "Basic scheduling",
        "SOAP notes",
        "Email support",
      ],
      cta: "Get Started Free",
      onClick: () => navigate("/auth"),
      highlighted: false,
    },
    {
      name: "Solo",
      price: "$49",
      popular: true,
      description: "Complete platform for solo practitioners",
      features: [
        "Unlimited clients",
        "Smart scheduling & calendar",
        "SOAP notes & documentation",
        "Client portal & messaging",
        "Progress path tracking",
        "Billing & invoicing",
        "AI-powered assistant",
        "Advanced analytics & reporting",
        "Priority support",
        "14-day free trial",
      ],
      cta: "Start 14-Day Free Trial",
      onClick: () => handleSubscribe("Solo"),
      highlighted: true,
      trialDays: 14,
    },
    {
      name: "Group",
      price: "$59",
      description: "$59/month for first clinician, $45/month for each additional",
      additionalInfo: "Up to 30 clinicians",
      features: [
        "Everything in Solo, plus:",
        "Up to 30 clinicians",
        "Multi-clinician scheduling",
        "Group calendar management",
        "Shared client resources",
        "Team collaboration tools",
        "Group billing & reports",
        "Priority phone support",
      ],
      cta: "Get Started",
      onClick: () => handleSubscribe("Group"),
      highlighted: false,
    },
    {
      name: "Enterprise (30+ users)",
      price: "Custom",
      description: "For large organizations",
      features: [
        "Everything in Group, plus:",
        "Custom integrations",
        "Advanced security features",
        "Custom training & onboarding",
        "SLA guarantees",
        "Volume pricing",
      ],
      cta: "Contact Sales",
      onClick: handleContactSales,
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="bg-primary/10 p-2 rounded-lg">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <span className="font-bold text-xl">Mindful AI</span>
          </div>
          <Button variant="ghost" onClick={() => navigate("/auth")}>
            Sign In
          </Button>
        </div>
      </header>

      {/* Pricing Section */}
      <section className="container mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-muted-foreground mb-2">
            Choose the plan that's right for your practice
          </p>
          <p className="text-sm text-muted-foreground">
            All paid plans include a 14-day free trial. Cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.name} className={`${plan.popular ? "border-primary shadow-xl scale-105" : ""} transition-all hover:shadow-lg flex flex-col`}>
              {plan.popular && (
                <div className="bg-primary text-primary-foreground text-center py-2 text-sm font-medium rounded-t-lg">
                  ⭐ Most Popular
                </div>
              )}
              <CardHeader className="flex-grow">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.price !== "Custom" && <span className="text-muted-foreground">/month</span>}
                  {"additionalInfo" in plan && (
                    <div className="text-sm text-muted-foreground mt-1">{plan.additionalInfo}</div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={plan.onClick}
                  disabled={loading === plan.name}
                  size="lg"
                >
                  {loading === plan.name ? "Processing..." : plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12 space-y-2">
          <p className="text-sm text-muted-foreground">
            Questions? <a href="mailto:founder@usemindful.ai" className="text-primary hover:underline">Contact our team</a>
          </p>
          <p className="text-xs text-muted-foreground">
            All plans are HIPAA-compliant and include secure data encryption
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-6 py-8 text-center text-muted-foreground">
          <p>&copy; 2025 Mindful AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

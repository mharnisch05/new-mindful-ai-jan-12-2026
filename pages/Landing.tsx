import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/SEOHead";
import { FooterWithHIPAA } from "@/components/FooterWithHIPAA";
import { Button } from "@/components/ui/button";
import { Brain, Shield } from "lucide-react";

// Landing Page Components
import { Hero } from "@/components/landing/Hero";
import { SocialProof } from "@/components/landing/SocialProof";
import { ProblemSolution } from "@/components/landing/ProblemSolution";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { OutcomeMetrics } from "@/components/landing/OutcomeMetrics";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { EarlyAccess } from "@/components/landing/EarlyAccess";
import { PricingTeaser } from "@/components/landing/PricingTeaser";
import { FAQ } from "@/components/landing/FAQ";

export default function Landing() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      } else {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleBookDemo = () => navigate("/auth?mode=signup&intent=demo"); // Assuming auth handles intent or just goes to signup
  const handleJoinWaitlist = () => navigate("/auth?mode=signup&intent=waitlist");

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <SEOHead
        title="Mindful AI - The Intelligent Practice Management Platform"
        description="Reduce admin overwhelm with Mindful AI. The all-in-one EMR that handles documentation, scheduling, and billing for modern therapists."
        keywords="mental health software, therapy practice management, EMR for therapists, AI SOAP notes, private practice software"
      />

      <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/20">
        {/* Header - Kept inline for simplicity as requested */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
          <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="bg-primary/10 p-2 rounded-lg">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold text-lg tracking-tight">Mindful AI</span>
            </div>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <button onClick={() => scrollToSection('features')} className="hover:text-foreground transition-colors">Features</button>
              <button onClick={() => scrollToSection('how-it-works')} className="hover:text-foreground transition-colors">How it Works</button>
              <button onClick={() => scrollToSection('faq')} className="hover:text-foreground transition-colors">FAQ</button>
            </nav>

            <div className="flex gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="hidden sm:inline-flex">
                Sign In
              </Button>
              <Button size="sm" onClick={handleBookDemo}>
                Book Demo
              </Button>
            </div>
          </div>
        </header>

        <main className="pt-16">
          <Hero onBookDemo={handleBookDemo} onJoinWaitlist={handleJoinWaitlist} />

          <SocialProof />

          <div id="features">
            <ProblemSolution />
            <FeaturesGrid />
          </div>

          <OutcomeMetrics />

          <div id="how-it-works">
            <HowItWorks />
          </div>

          <EarlyAccess onJoinWaitlist={handleJoinWaitlist} />

          <PricingTeaser onBookDemo={handleBookDemo} onJoinWaitlist={handleJoinWaitlist} />

          <div id="faq">
            <FAQ />
          </div>
        </main>

        <footer className="border-t bg-muted/20">
          <div className="container mx-auto px-6 py-12">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div className="col-span-1 md:col-span-2 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Brain className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-bold text-lg">Mindful AI</span>
                </div>
                <p className="text-muted-foreground max-w-xs">
                  Empowering manual health professionals with intelligent tools for better care and better business.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Product</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><button onClick={() => scrollToSection('features')} className="hover:text-foreground">Features</button></li>
                  <li><button onClick={() => scrollToSection('how-it-works')} className="hover:text-foreground">How it Works</button></li>
                  <li><button onClick={() => navigate("/pricing")} className="hover:text-foreground">Pricing</button></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Company</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><button onClick={() => navigate("/hipaa-compliance")} className="hover:text-foreground">HIPAA & Security</button></li>
                  <li><a href="mailto:support@usemindful.ai" className="hover:text-foreground">Contact Support</a></li>
                  <li><button onClick={() => navigate("/auth")} className="hover:text-foreground">Login</button></li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">&copy; 2025 Mindful AI Labs LLC. All rights reserved.</p>
              <div className="flex gap-4">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  HIPAA Compliant
                </div>
              </div>
            </div>
          </div>
        </footer>
        <FooterWithHIPAA />
      </div>
    </>
  );
}
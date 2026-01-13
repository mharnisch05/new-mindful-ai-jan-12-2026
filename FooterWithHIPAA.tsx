import { Shield } from "lucide-react";
import { Link } from "react-router-dom";

export function FooterWithHIPAA() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4 text-primary" />
            <span className="font-semibold">HIPAA Compliant</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link to="/hipaa-compliance" className="text-muted-foreground hover:text-primary transition-colors">
              HIPAA & Security
            </Link>
            <a href="mailto:support@usemindful.ai" className="text-muted-foreground hover:text-primary transition-colors">
              Support
            </a>
            <span className="text-muted-foreground">
              © {new Date().getFullYear()} Mindful AI
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
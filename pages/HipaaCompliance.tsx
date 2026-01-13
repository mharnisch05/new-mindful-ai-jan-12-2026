import { Shield, Lock, Eye, FileText, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

export default function HipaaCompliance() {
  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">HIPAA & Security</h1>
        <p className="text-lg text-muted-foreground">
          Your data security and privacy are our highest priorities
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <CardTitle>HIPAA Compliance Statement</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base">
            <strong>Mindful AI is HIPAA-compliant.</strong> We implement comprehensive administrative, physical, and technical safeguards to protect Protected Health Information (PHI) in accordance with the Health Insurance Portability and Accountability Act.
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>All data encrypted at rest using AES-256 encryption</li>
            <li>All data encrypted in transit using TLS 1.3</li>
            <li>Regular security audits and vulnerability assessments</li>
            <li>Access controls and authentication requirements</li>
            <li>Comprehensive audit logging of all PHI access</li>
            <li>Secure backup and disaster recovery procedures</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            <CardTitle>Business Associate Agreement (BAA)</CardTitle>
          </div>
          <CardDescription>
            Required for HIPAA compliance when handling PHI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            A Business Associate Agreement (BAA) is available for all paid accounts. This legally binding document ensures Mindful AI's compliance with HIPAA regulations as your Business Associate.
          </p>
          <Button onClick={() => window.location.href = 'mailto:support@usemindful.ai?subject=BAA Request'}>
            <Mail className="w-4 h-4 mr-2" />
            Request BAA
          </Button>
          <p className="text-sm text-muted-foreground">
            Contact us at <a href="mailto:support@usemindful.ai" className="text-primary hover:underline">support@usemindful.ai</a> to receive your signed BAA.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-6 h-6 text-primary" />
            <CardTitle>Session Security</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Automatic Session Timeout</h3>
            <p className="text-muted-foreground">
              Sessions automatically expire after <strong>5 minutes of inactivity</strong> to protect your data. You will receive a warning 1 minute before timeout.
            </p>
          </div>
          <Separator />
          <div className="space-y-2">
            <h3 className="font-semibold">Two-Factor Authentication (2FA)</h3>
            <p className="text-muted-foreground">
              We strongly recommend enabling 2FA for additional account security. You can enable this in your Settings page.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="w-6 h-6 text-primary" />
            <CardTitle>Audit Logging & Transparency</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            All access to Protected Health Information is logged and auditable. You can view your audit logs in the Settings page to see:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Who accessed client records and when</li>
            <li>What changes were made to clinical documentation</li>
            <li>Login attempts and authentication events</li>
            <li>Data exports and system actions</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Our Privacy Policy outlines how we collect, use, store, and protect your information in compliance with HIPAA and other privacy regulations.
          </p>
          <div className="space-y-2">
            <h3 className="font-semibold">Key Principles:</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>We never sell or share your PHI with third parties</li>
              <li>Data is only accessible to authorized users</li>
              <li>You maintain full ownership and control of your data</li>
              <li>You can export or delete your data at any time</li>
              <li>We use industry-standard security practices</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="space-y-2 text-center">
            <p className="text-sm text-muted-foreground">
              Questions about security or compliance?
            </p>
            <Button variant="outline" onClick={() => window.location.href = 'mailto:support@usemindful.ai'}>
              Contact Security Team
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
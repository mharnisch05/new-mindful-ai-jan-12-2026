import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_CLIENT_CODE } from "@/contexts/DemoModeContext";
import { handleError } from "@/utils/errorTracking";

const codeSchema = z.object({
  code: z.string().trim().length(5, "Enter the 5‑character code").regex(/^[A-Z2-9]{5}$/i, "Invalid code"),
});

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Name is required").max(120),
  email: z.string().trim().email("Invalid email").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .refine((val) => /[A-Z]/.test(val), { message: "Must include at least one uppercase letter" })
    .refine((val) => /\d/.test(val), { message: "Must include at least one number" })
    .refine((val) => /[^A-Za-z0-9]/.test(val), { message: "Must include at least one special character" }),
});

const resetCodeSchema = z.object({
  email: z.string().trim().email("Invalid email"),
  code: z.string().trim().length(6, "Code must be 6 characters").regex(/^[A-Z0-9]{6}$/i, "Invalid code format"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .refine((val) => /[A-Z]/.test(val), { message: "Must include at least one uppercase letter" })
    .refine((val) => /\d/.test(val), { message: "Must include at least one number" })
    .refine((val) => /[^A-Za-z0-9]/.test(val), { message: "Must include at least one special character" }),
});

export default function ClientPortalAccess() {
  const [step, setStep] = useState<"code" | "signup" | "reset">("code");
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState("");
  const [validated, setValidated] = useState<null | { 
    clientId: string; 
    professionalId: string; 
    clientInfo?: { email?: string; first_name?: string; last_name?: string };
    professionalInfo?: { full_name?: string; email?: string };
  }>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [sendingReset, setSendingReset] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Client Portal Access | Secure Code Login";
  }, []);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedCode = code.trim().toUpperCase();
    
    // Check for demo client code
    if (normalizedCode === DEMO_CLIENT_CODE) {
      setVerifying(true);
      toast({
        title: "Demo Client Access",
        description: "Logging you in as a demo client...",
      });
      
      try {
        // First try to sign in with demo credentials
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
        });
        
        if (signInError) {
          // Demo account doesn't exist, seed it first
          await supabase.functions.invoke("seed-demo-data");
          
          // Retry sign in
          const { error: retryError } = await supabase.auth.signInWithPassword({
            email: DEMO_EMAIL,
            password: DEMO_PASSWORD,
          });
          
          if (retryError) throw retryError;
        }
        
        toast({
          title: "Welcome to Demo Client Portal",
          description: "Explore all client features - changes won't be saved",
        });
        navigate("/client-portal");
        return;
      } catch (err: any) {
        await handleError(err, '/client-portal-access', toast);
      } finally {
        setVerifying(false);
      }
      return;
    }
    
    const parsed = codeSchema.safeParse({ code });
    if (!parsed.success) {
      toast({ title: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setVerifying(true);
    
    // Create timeout promise (10 seconds)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), 10000)
    );
    
    try {
      const invokePromise = supabase.functions.invoke("validate-client-code", {
        body: { code: parsed.data.code.toUpperCase() },
      });

      // Race between the actual request and timeout
      const { data, error } = await Promise.race([invokePromise, timeoutPromise]) as any;

      if (error) {
        let friendly = "We couldn't verify that code. Please double-check it and try again.";
        
        if (error.message === 'Request timeout') {
          friendly = "Network error. Please check your connection and try again.";
        } else if (data?.error) {
          friendly = data.error;
        }
        
        toast({ title: friendly, variant: "destructive" });
        return;
      }

      if (!data?.valid) {
        let errorTitle = "Invalid or expired code";
        let errorDescription = "Please check the code and try again.";
        
        if (data?.error?.includes("expired")) {
          errorTitle = "Access code has expired";
          errorDescription = "Please request a new code from your therapist.";
        } else if (data?.error?.includes("Too many")) {
          errorTitle = data.error;
          errorDescription = "Please wait an hour before trying again.";
        }
        
        toast({
          title: errorTitle,
          description: errorDescription,
          variant: "destructive",
        });
        return;
      }

      setValidated({ clientId: data.clientId, professionalId: data.professionalId, clientInfo: data.clientInfo, professionalInfo: data.professionalInfo });
      setStep("signup");
      if (data.clientInfo?.email) setEmail(data.clientInfo.email);
    } catch (err: any) {
      let errorMessage = "We couldn't verify that code. Please try again.";
      
      if (err.message === 'Request timeout') {
        errorMessage = "Network error. The request timed out. Please check your connection and try again.";
      }
      
      toast({ title: errorMessage, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse({ fullName, email, password });
    if (!parsed.success || !validated) {
      toast({ title: parsed.success ? "Missing validation" : parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const [firstName, ...rest] = parsed.data.fullName.split(" ");
      const lastName = rest.join(" ");

      const { data, error } = await supabase.functions.invoke("complete-client-signup", {
        body: {
          email: parsed.data.email,
          password: parsed.data.password,
          accessCode: code.toUpperCase(),
          clientId: validated.clientId,
          professionalId: validated.professionalId,
          firstName,
          lastName,
        },
      });
      if (error) throw error;

      // Sign in the new user
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
      if (signInError) throw signInError;

      toast({ title: "Welcome to your portal" });
      
      // Navigate based on admin code or client
      if (code.toUpperCase() === '67YEW') {
        navigate("/admin-dashboard");
      } else {
        navigate("/client-portal");
      }
    } catch (err: any) {
      await handleError(err, '/client-portal-access', toast);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestReset = async () => {
    if (!resetEmail) {
      toast({ title: "Please enter your email", variant: "destructive" });
      return;
    }
    setSendingReset(true);
    try {
      const { error } = await supabase.functions.invoke("request-password-reset", {
        body: { email: resetEmail },
      });
      if (error) throw error;
      toast({ title: "Reset code sent", description: "Check your email for the 6-character code." });
      setStep("reset");
    } catch (err: any) {
      toast({ title: err.message || "Failed to send reset email", variant: "destructive" });
    } finally {
      setSendingReset(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = resetCodeSchema.safeParse({ email: resetEmail, code: resetCode, newPassword });
    if (!parsed.success) {
      toast({ title: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setResettingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-password-with-code", {
        body: {
          email: parsed.data.email,
          code: parsed.data.code.toUpperCase(),
          newPassword: parsed.data.newPassword,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast({ title: "Password reset successful", description: "You can now log in with your new password." });
      setStep("code");
      setResetEmail("");
      setResetCode("");
      setNewPassword("");
    } catch (err: any) {
      toast({ title: err.message || "Failed to reset password", variant: "destructive" });
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold">Client Portal</h1>
          <p className="text-sm text-muted-foreground">Secure access using your 5‑character code</p>
        </div>
      </header>

      <main className="container mx-auto p-6 max-w-2xl">
        {step === "code" ? (
          <Card>
            <CardHeader>
              <CardTitle>Enter Access Code</CardTitle>
              <CardDescription>We emailed you a 5‑character code from your professional.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Access Code</Label>
                  <Input id="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={5} placeholder="ABCDE" />
                </div>
                 <Button type="submit" disabled={verifying}>{verifying ? "Verifying..." : "Continue"}</Button>
              </form>
              <div className="mt-6 pt-6 border-t space-y-3">
                <p className="text-sm font-medium">Forgot Password?</p>
                <div className="flex gap-2">
                  <Input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="your@email.com" />
                  <Button type="button" variant="secondary" disabled={sendingReset} onClick={handleRequestReset}>
                    {sendingReset ? "Sending..." : "Send Code"}
                  </Button>
                </div>
              </div>
             </CardContent>
          </Card>
        ) : step === "reset" ? (
          <Card>
            <CardHeader>
              <CardTitle>Reset Your Password</CardTitle>
              <CardDescription>Enter the 6-character code from your email and your new password.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resetCode">6-Character Code</Label>
                  <Input 
                    id="resetCode" 
                    value={resetCode} 
                    onChange={(e) => setResetCode(e.target.value.toUpperCase())} 
                    maxLength={6} 
                    placeholder="ABC123" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input 
                    id="newPassword" 
                    type="password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    placeholder="Strong password" 
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={resettingPassword}>
                    {resettingPassword ? "Resetting..." : "Reset Password"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setStep("code"); setResetCode(""); setNewPassword(""); }}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Create Your Account</CardTitle>
              <CardDescription>Set your name, email, and password to access your portal.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
                </div>
                <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create Account"}</Button>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

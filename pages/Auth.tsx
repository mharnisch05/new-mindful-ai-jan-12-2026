import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Brain, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { validatePassword, getPasswordStrength } from "@/utils/password";
import { validateEmail, validatePhone, sanitizeInput, isSafeInput } from "@/utils/inputValidation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_CLIENT_CODE } from "@/contexts/DemoModeContext";

type AuthMode = "signin" | "professional-signup" | "client-signup" | "forgot-password";


interface ClientInfo {
  isAdmin?: boolean;
  clientId?: string;
  professionalId?: string;
  professionalInfo?: {
    full_name: string;
  };
  valid?: boolean;
  error?: string;
}

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [loading, setLoading] = useState(false);

  // Sign In state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Professional signup state
  const [profFullName, setProfFullName] = useState("");
  const [profEmail, setProfEmail] = useState("");
  const [profPassword, setProfPassword] = useState("");
  const [profPhone, setProfPhone] = useState("");
  const [profTitle, setProfTitle] = useState("");
  const [profSpecialty, setProfSpecialty] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Common professional titles
  const professionalTitles = [
    "Licensed Professional Counselor (LPC)",
    "Licensed Clinical Social Worker (LCSW)",
    "Licensed Marriage and Family Therapist (LMFT)",
    "Psychologist (PhD/PsyD)",
    "Psychiatrist (MD/DO)",
    "Licensed Mental Health Counselor (LMHC)",
    "Licensed Professional Clinical Counselor (LPCC)",
    "Certified Clinical Mental Health Counselor (CCMHC)",
    "Therapist",
    "Counselor",
    "Other"
  ];

  // Client signup state
  const [accessCode, setAccessCode] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPassword, setClientPassword] = useState("");
  const [codeValidated, setCodeValidated] = useState(false);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetStep, setResetStep] = useState<"email" | "code">("email");
  const [generatedCode, setGeneratedCode] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      setLoading(false);
      toast({
        title: "Sign in timed out",
        description: "Please try again",
        variant: "destructive",
      });
      controller.abort();
    }, 10000);

    try {
      // Check if this is the demo account login
      const isDemoLogin = email.toLowerCase() === DEMO_EMAIL.toLowerCase();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      clearTimeout(timeoutId);

      if (error) {
        // If demo account doesn't exist, seed it first
        if (isDemoLogin && error.message.includes("Invalid login credentials")) {
          toast({
            title: "Setting up demo account...",
            description: "Please wait a moment",
          });

          try {
            await supabase.functions.invoke("seed-demo-data");
            // Retry login
            const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (retryError) throw retryError;

            toast({
              title: "Welcome to Demo Mode",
              description: "Explore all features - changes won't be saved",
            });
            navigate("/dashboard");
            return;
          } catch (seedError) {
            // seedError ignored in production/polish, just throw original error
            throw error;
          }
        }

        setShowForgotPassword(true);
        throw error;
      }

      // Show demo welcome toast
      if (isDemoLogin) {
        toast({
          title: "Welcome to Demo Mode",
          description: "Explore all features - changes won't be saved",
        });
      }

      // Check user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (roleData?.role === "client") {
        navigate("/client-portal");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      const error = err as Error;
      if (error.name !== 'AbortError') {
        clearTimeout(timeoutId);
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfessionalSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate submissions
    if (submitting) return;

    // Validate all required fields
    if (!profFullName.trim() || !profEmail.trim() || !profPassword || !profTitle) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Sanitize inputs
    const sanitizedName = sanitizeInput(profFullName, 100);
    const sanitizedEmail = sanitizeInput(profEmail.toLowerCase(), 255);
    const sanitizedPhone = profPhone.trim();
    const sanitizedTitle = sanitizeInput(profTitle, 100);
    const sanitizedSpecialty = sanitizeInput(profSpecialty, 200);

    // Check for malicious input
    if (!isSafeInput(sanitizedName) || !isSafeInput(sanitizedTitle) || !isSafeInput(sanitizedSpecialty)) {
      toast({
        title: "Invalid input detected",
        description: "Please check your input and try again",
        variant: "destructive"
      });
      return;
    }

    // Validate email format
    if (!validateEmail(sanitizedEmail)) {
      setEmailError("Invalid email format");
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    // Validate phone if provided
    if (sanitizedPhone && !validatePhone(sanitizedPhone)) {
      setPhoneError("Invalid phone format (e.g., +1234567890)");
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number with country code",
        variant: "destructive"
      });
      return;
    }

    // Validate password
    const validation = validatePassword(profPassword);
    if (!validation.valid) {
      toast({
        title: "Password requirements not met",
        description: validation.errors.join(', '),
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setSubmitting(true);

    const startTime = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setSubmitting(false);
      toast({
        title: "Signup timed out",
        description: "Please try again",
        variant: "destructive",
      });
      controller.abort();
    }, 10000);

    try {
      // Check for duplicate email first
      const { data: existingUsers, error: checkError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', sanitizedEmail)
        .maybeSingle();

      if (existingUsers) {
        throw new Error("An account with this email already exists");
      }

      const { data, error } = await supabase.functions.invoke("complete-professional-signup", {
        body: {
          email: sanitizedEmail,
          password: profPassword,
          fullName: sanitizedName,
          phone: sanitizedPhone || null,
          officialTitle: sanitizedTitle,
          specialty: sanitizedSpecialty || null,
        },
      });

      clearTimeout(timeoutId);

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.success) {
        toast({
          title: "Account created successfully!",
          description: data.message || "Signing you in...",
        });

        setHasUnsavedChanges(false);

        // Auto sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: sanitizedEmail,
          password: profPassword,
        });

        if (!signInError) {
          navigate("/dashboard");
        } else {
          toast({
            title: "Account created",
            description: "Please sign in with your credentials",
          });
          setAuthMode("signin");
          setEmail(sanitizedEmail);
        }
      }
    } catch (err) {
      const error = err as Error;
      if (error.name !== 'AbortError') {
        clearTimeout(timeoutId);

        let errorMessage = error.message;

        // Provide user-friendly error messages
        if (errorMessage.includes("already exists") || errorMessage.includes("duplicate")) {
          errorMessage = "An account with this email already exists. Please sign in instead.";
        } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else if (errorMessage.includes("timeout")) {
          errorMessage = "Request timed out. Please try again.";
        }

        toast({
          title: "Signup failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  // Real-time password strength feedback
  useEffect(() => {
    if (profPassword) {
      setPasswordStrength(getPasswordStrength(profPassword));
    } else {
      setPasswordStrength(null);
    }
  }, [profPassword]);

  // Track unsaved changes
  useEffect(() => {
    const hasChanges = profFullName || profEmail || profPassword || profPhone || profTitle || profSpecialty;
    setHasUnsavedChanges(!!hasChanges);
  }, [profFullName, profEmail, profPassword, profPhone, profTitle, profSpecialty]);

  // Warn before tab switch if unsaved changes
  const handleTabChange = (value: string) => {
    if (hasUnsavedChanges && authMode === "professional-signup") {
      if (!window.confirm("You have unsaved changes. Are you sure you want to switch tabs?")) {
        return;
      }
      // Clear form
      setProfFullName("");
      setProfEmail("");
      setProfPassword("");
      setProfPhone("");
      setProfTitle("");
      setProfSpecialty("");
      setEmailError("");
      setPhoneError("");
      setPasswordStrength(null);
      setHasUnsavedChanges(false);
    }
    setAuthMode(value as AuthMode);
  };

  const validateAccessCode = async () => {
    const normalizedCode = accessCode.trim().toUpperCase();
    if (normalizedCode.length !== 5) {
      toast({
        title: "Invalid code format",
        description: "Access codes are 5 characters. Please double-check and try again.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("validate-client-code", {
        body: { code: normalizedCode },
      });

      if (error) throw error;

      if (data.valid) {
        setCodeValidated(true);
        setClientInfo(data);
        toast({
          title: "Code validated",
          description: `You'll be linked to ${data.professionalInfo.full_name}`,
        });
      } else {
        toast({
          title: "Invalid code",
          description: data.error || "Please check your code and try again",
          variant: "destructive",
        });
      }
    } catch (err) {
      // Access code validation error ignored in polish
      toast({
        title: "We couldn't verify that code",
        description: "Please double-check it and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const requestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("request-password-reset", {
        body: { email: forgotEmail },
      });

      if (error) throw error;

      toast({
        title: "Reset code sent",
        description: "Check your email for the 5-character reset code",
      });
      setResetStep("code");
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Request failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetPasswordWithCode = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      toast({
        title: "Password requirements not met",
        description: validation.errors.join(', '),
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("reset-password-with-code", {
        body: { email: forgotEmail, code: resetCode, newPassword },
      });

      if (error) throw error;

      toast({
        title: "Password reset successful",
        description: "You can now sign in with your new password",
      });
      setAuthMode("signin");
      setResetStep("email");
      setForgotEmail("");
      setResetCode("");
      setNewPassword("");
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Reset failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClientSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password
    const validation = validatePassword(clientPassword);
    if (!validation.valid) {
      toast({
        title: "Password requirements not met",
        description: validation.errors.join(', '),
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      setLoading(false);
      toast({
        title: "Signup timed out",
        description: "Please try again",
        variant: "destructive",
      });
      controller.abort();
    }, 10000);

    try {
      // Check if this is admin trying to login with existing credentials
      if (clientInfo?.isAdmin) {
        // Try to sign in with existing credentials
        const { data, error } = await supabase.auth.signInWithPassword({
          email: clientEmail,
          password: clientPassword,
        });

        clearTimeout(timeoutId);

        if (error) throw error;

        // Check if user has client role or can access client portal
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .maybeSingle();

        // Admin can access both, navigate to client portal
        toast({
          title: "Welcome Admin!",
          description: "Accessing client portal",
        });
        navigate("/client-portal");
        return;
      }

      // Regular client signup flow
      const { data, error } = await supabase.functions.invoke("complete-client-signup", {
        body: {
          email: clientEmail,
          password: clientPassword,
          accessCode,
          clientId: clientInfo.clientId,
          professionalId: clientInfo.professionalId,
        },
      });

      clearTimeout(timeoutId);

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Account created!",
          description: "You can now sign in with your credentials",
        });

        // Auto sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: clientEmail,
          password: clientPassword,
        });

        if (!signInError) {
          navigate("/client-portal");
        }
      }
    } catch (err) {
      const error = err as Error;
      if (error.name !== 'AbortError') {
        clearTimeout(timeoutId);
        toast({
          title: clientInfo?.isAdmin ? "Sign in failed" : "Signup failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-xl">
              <Brain className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Mindful AI</CardTitle>
          <CardDescription>Your AI-powered therapy practice platform</CardDescription>
        </CardHeader>

        <Tabs value={authMode} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="professional-signup">Professional</TabsTrigger>
            <TabsTrigger value="client-signup">Client</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="flex-col space-y-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
                {showForgotPassword && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setAuthMode("forgot-password");
                      setForgotEmail(email);
                      setShowForgotPassword(false);
                    }}
                  >
                    Forgot Password?
                  </Button>
                )}
              </CardFooter>
            </form>
          </TabsContent>

          <TabsContent value="professional-signup">
            <form onSubmit={handleProfessionalSignup}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prof-name">Full Name *</Label>
                  <Input
                    id="prof-name"
                    value={profFullName}
                    onChange={(e) => setProfFullName(e.target.value)}
                    placeholder="John Smith"
                    maxLength={100}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prof-email">Email *</Label>
                  <Input
                    id="prof-email"
                    type="email"
                    value={profEmail}
                    onChange={(e) => {
                      setProfEmail(e.target.value);
                      setEmailError("");
                    }}
                    placeholder="john@example.com"
                    maxLength={255}
                    required
                    disabled={submitting}
                  />
                  {emailError && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      {emailError}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prof-password">Password *</Label>
                  <Input
                    id="prof-password"
                    type="password"
                    value={profPassword}
                    onChange={(e) => setProfPassword(e.target.value)}
                    placeholder="Min 8 chars, uppercase, number, special char"
                    required
                    disabled={submitting}
                  />
                  {passwordStrength && (
                    <div className="flex items-center gap-2">
                      {passwordStrength === 'weak' && (
                        <Alert variant="destructive" className="py-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            Weak password. Add uppercase, numbers, and special characters.
                          </AlertDescription>
                        </Alert>
                      )}
                      {passwordStrength === 'medium' && (
                        <Alert className="py-2 border-yellow-500 text-yellow-600">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            Medium strength. Consider making it longer.
                          </AlertDescription>
                        </Alert>
                      )}
                      {passwordStrength === 'strong' && (
                        <Alert className="py-2 border-green-500 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            Strong password!
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prof-phone">Phone (Optional)</Label>
                  <Input
                    id="prof-phone"
                    type="tel"
                    value={profPhone}
                    onChange={(e) => {
                      setProfPhone(e.target.value);
                      setPhoneError("");
                    }}
                    placeholder="+1234567890"
                    disabled={submitting}
                  />
                  {phoneError && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      {phoneError}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Include country code (e.g., +1 for US)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prof-title">Official Title *</Label>
                  <Select
                    value={profTitle}
                    onValueChange={(value) => {
                      setProfTitle(value);
                      // Clear custom title if switching away from Other
                      if (value !== "Other") {
                        // Title is set directly from dropdown
                      }
                    }}
                    disabled={submitting}
                  >
                    <SelectTrigger id="prof-title">
                      <SelectValue placeholder="Select your professional title" />
                    </SelectTrigger>
                    <SelectContent>
                      {professionalTitles.map((title) => (
                        <SelectItem key={title} value={title}>
                          {title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prof-specialty">Specialty (Optional)</Label>
                  <Input
                    id="prof-specialty"
                    value={profSpecialty}
                    onChange={(e) => setProfSpecialty(e.target.value)}
                    placeholder="e.g., Trauma, Anxiety, Depression, Family Therapy"
                    maxLength={200}
                    disabled={submitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your areas of expertise or specialization
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || submitting}
                >
                  {submitting ? "Creating account..." : "Create Professional Account"}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>

          <TabsContent value="client-signup">
            {!codeValidated ? (
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="access-code">Access Code</Label>
                  <Input
                    id="access-code"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    placeholder="Enter 5-character code"
                    maxLength={5}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter the code provided by your therapist
                  </p>
                </div>
                <Button onClick={validateAccessCode} className="w-full" disabled={loading || accessCode.length !== 5}>
                  {loading ? "Validating..." : "Validate Code"}
                </Button>
              </CardContent>
            ) : (
              <form onSubmit={handleClientSignup}>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {clientInfo?.isAdmin ? (
                        <>Admin Access: <span className="font-semibold text-foreground">Sign in with your credentials</span></>
                      ) : (
                        <>Connecting with: <span className="font-semibold text-foreground">{clientInfo?.professionalInfo?.full_name}</span></>
                      )}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-email">{clientInfo?.isAdmin ? "Admin Email" : "Your Email"}</Label>
                    <Input
                      id="client-email"
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-password">{clientInfo?.isAdmin ? "Admin Password" : "Create Password"}</Label>
                    <Input
                      id="client-password"
                      type="password"
                      value={clientPassword}
                      onChange={(e) => setClientPassword(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex-col space-y-2">
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (clientInfo?.isAdmin ? "Signing in..." : "Creating account...") : (clientInfo?.isAdmin ? "Sign In" : "Complete Signup")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setCodeValidated(false);
                      setClientInfo(null);
                      setClientEmail("");
                      setClientPassword("");
                    }}
                  >
                    Use Different Code
                  </Button>
                </CardFooter>
              </form>
            )}
          </TabsContent>

          <TabsContent value="forgot-password">
            {resetStep === "email" ? (
              <form onSubmit={requestPasswordReset}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Sending..." : "Send Reset Code"}
                  </Button>
                </CardFooter>
              </form>
            ) : (
              <form onSubmit={resetPasswordWithCode}>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">Your reset code: <span className="font-mono font-bold">{generatedCode}</span></p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reset-code">Reset Code</Label>
                    <Input
                      id="reset-code"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.toUpperCase())}
                      maxLength={5}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Min 8 chars, uppercase, number, special character
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex-col space-y-2">
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Resetting..." : "Reset Password"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setResetStep("email")}
                  >
                    Back
                  </Button>
                </CardFooter>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

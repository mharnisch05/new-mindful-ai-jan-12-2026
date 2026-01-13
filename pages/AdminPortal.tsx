import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Lock, Loader2 } from "lucide-react";
import { handleError } from "@/utils/errorTracking";

export default function AdminPortal() {
  const [step, setStep] = useState<"code" | "login">("code");
  const [loading, setLoading] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setAccessCode("");
  }, []);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoading(false);
        toast({
          title: "Timeout",
          description: "Request took too long. Please try again.",
          variant: "destructive",
        });
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [loading, toast]);

  const handleCodeVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc("verify_admin_access_code", {
        input_code: accessCode,
      });

      if (error) throw error;

      if (data) {
        toast({
          title: "Code Verified",
          description: "Please enter your admin credentials",
        });
        setStep("login");
      } else {
        toast({
          title: "Invalid Code",
          description: "The access code you entered is incorrect",
          variant: "destructive",
        });
      }
    } catch (error) {
      await handleError(error, '/admin-portal', toast);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First, try to sign in
      let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // If password is incorrect, try to update it (for first-time setup)
      if (signInError && signInError.message.includes("Invalid login credentials")) {
        const { error: updateError } = await supabase.functions.invoke("update-admin-password", {
          body: { email, password },
        });

        if (updateError) throw updateError;

        // Try signing in again with the new password
        const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (retryError) throw retryError;
        signInData = retryData;
      } else if (signInError) {
        throw signInError;
      }

      const user = signInData?.user;
      if (!user) throw new Error("No user data received");

      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleError && roleError.code !== "PGRST116") {
        // Silent fail for role check
      }

      if (roleData?.role === "admin") {
        // User already has admin role
        // SECURITY: Admin status is validated server-side via user_roles table
        // Never store admin status in localStorage - always rely on server-side checks
        toast({
          title: "Welcome Admin",
          description: "Successfully logged in",
        });
        navigate("/admin-dashboard");
        return;
      }

      // If no admin role exists, set it up
      const { error: setupError } = await supabase.rpc("setup_admin_user", {
        admin_email: email,
        admin_code: accessCode,
      });

      if (setupError) {
        // Silent fail for admin setup
        throw new Error("Failed to setup admin role");
      }

      // SECURITY: Admin status is validated server-side via user_roles table
      // Never store admin status in localStorage - always rely on server-side checks
      toast({
        title: "Admin Access Granted",
        description: "You now have admin privileges",
      });
      navigate("/admin-dashboard");
    } catch (error: any) {
      await handleError(error, '/admin-portal', toast);
      toast({
        title: "Login Failed",
        description: error.message || "Unable to login with provided credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            {step === "code" ? (
              <Shield className="h-12 w-12 text-primary" />
            ) : (
              <Lock className="h-12 w-12 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {step === "code" ? "Admin Portal Access" : "Admin Login"}
          </CardTitle>
          <CardDescription>
            {step === "code"
              ? "Enter the 7-digit access code to continue"
              : "Enter your admin credentials"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "code" ? (
            <form onSubmit={handleCodeVerification} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accessCode">Access Code</Label>
                <Input
                  id="accessCode"
                  type="text"
                  placeholder="XXXXXXX"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  maxLength={7}
                  className="text-center text-lg tracking-widest"
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || accessCode.length !== 7}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Code"
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
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
                  disabled={loading}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("code")}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

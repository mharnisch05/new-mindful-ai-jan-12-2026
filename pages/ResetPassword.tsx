import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128)
      .refine((val) => /[A-Z]/.test(val), { message: "Must include at least one uppercase letter" })
      .refine((val) => /\d/.test(val), { message: "Must include at least one number" })
      .refine((val) => /[^A-Za-z0-9]/.test(val), { message: "Must include at least one special character" }),
    confirm: z.string(),
  })
  .refine((vals) => vals.password === vals.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Reset Password | Client Portal";
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ password, confirm });
    if (!parsed.success) {
      toast({ title: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    try {
      setSubmitting(true);
      const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
      if (error) throw error;
      toast({ title: "Password updated" });
      navigate("/auth");
    } catch (err: any) {
      toast({ title: err.message || "Failed to update password", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="text-sm text-muted-foreground">Set a new password for your account.</p>
        </div>
      </header>

      <main className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Create a New Password</CardTitle>
            <CardDescription>Use a strong password with uppercase, number and special character.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Strong password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" />
              </div>
              <Button type="submit" disabled={submitting}>{submitting ? "Updating..." : "Update Password"}</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Lock } from "lucide-react";

export default function InstructorLanding() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Enter your email", description: "Please enter your email address first.", variant: "destructive" });
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setResetSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left decorative panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12">
        <div className="max-w-md space-y-6 text-primary-foreground">
          <div className="flex items-center gap-3">
            <Lock className="h-8 w-8 opacity-80" />
            <span className="font-display text-2xl font-bold tracking-tight">Kinspace</span>
          </div>
          <h2 className="font-display text-4xl font-bold leading-tight">
            Your studio,<br />your command center.
          </h2>
          <p className="text-primary-foreground/70 text-lg leading-relaxed">
            View rosters, manage your schedule, and request subs via SmartCover — all in one place.
          </p>
          <div className="flex gap-6 pt-4 text-sm text-primary-foreground/50">
            <span>📋 Live Rosters</span>
            <span>📅 My Schedule</span>
            <span>⚡ SmartCover</span>
          </div>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-md border-0 shadow-none sm:border sm:shadow-sm">
          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* Mobile header */}
            <div className="lg:hidden flex items-center gap-2 mb-2">
              <Lock className="h-5 w-5 text-primary" />
              <span className="font-display text-lg font-bold text-foreground">Kinspace</span>
            </div>

            <div className="space-y-2">
              <h1 className="font-display text-2xl font-bold text-foreground">
                Staff Portal
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Log in to view your upcoming rosters, manage your schedule, and request subs via SmartCover.
              </p>
            </div>

            {forgotMode ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {resetSent ? (
                  <div className="rounded-lg bg-muted p-4 text-center space-y-2">
                    <p className="text-sm font-medium text-foreground">Check your email</p>
                    <p className="text-xs text-muted-foreground">
                      We sent a password reset link to <strong>{email}</strong>.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email address</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="you@studio.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Send Reset Link
                    </Button>
                  </>
                )}
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline w-full text-center"
                  onClick={() => { setForgotMode(false); setResetSent(false); }}
                >
                  ← Back to sign in
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@studio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Sign In to Portal
                </Button>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline w-full text-center"
                  onClick={() => setForgotMode(true)}
                >
                  Forgot password?
                </button>
              </form>
            )}

            <p className="text-[11px] text-muted-foreground/60 text-center pt-2">
              This portal is for staff only. Students can book classes at the studio's booking page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

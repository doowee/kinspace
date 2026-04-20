import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type Status = "loading" | "valid" | "already" | "invalid" | "submitting" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    const validate = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: apiKey } }
        );
        const data = await res.json();
        if (!res.ok) { setStatus("invalid"); return; }
        if (data.valid === false && data.reason === "already_unsubscribed") setStatus("already");
        else if (data.valid) setStatus("valid");
        else setStatus("invalid");
      } catch {
        setStatus("error");
      }
    };
    validate();
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    setStatus("submitting");
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
    if (error) { setStatus("error"); return; }
    if (data?.success || data?.reason === "already_unsubscribed") setStatus("done");
    else setStatus("error");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-display">Email Preferences</CardTitle>
          <CardDescription>Manage your email subscription</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <div className="py-6"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
          )}
          {status === "valid" && (
            <>
              <p className="text-sm text-muted-foreground">Click below to unsubscribe from these emails. You will no longer receive notifications at this address.</p>
              <Button onClick={handleConfirm} className="w-full">Confirm Unsubscribe</Button>
            </>
          )}
          {status === "submitting" && (
            <div className="py-6"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
          )}
          {status === "done" && (
            <div className="py-4 space-y-2">
              <CheckCircle2 className="h-10 w-10 mx-auto text-green-600" />
              <p className="text-sm text-foreground font-medium">You've been unsubscribed.</p>
              <p className="text-xs text-muted-foreground">You will no longer receive emails at this address.</p>
            </div>
          )}
          {status === "already" && (
            <div className="py-4 space-y-2">
              <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-foreground font-medium">Already unsubscribed.</p>
              <p className="text-xs text-muted-foreground">This address was previously removed from our list.</p>
            </div>
          )}
          {status === "invalid" && (
            <div className="py-4 space-y-2">
              <AlertCircle className="h-10 w-10 mx-auto text-amber-500" />
              <p className="text-sm text-foreground font-medium">Invalid or expired link.</p>
              <p className="text-xs text-muted-foreground">This unsubscribe link is no longer valid.</p>
            </div>
          )}
          {status === "error" && (
            <div className="py-4 space-y-2">
              <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
              <p className="text-sm text-foreground font-medium">Something went wrong.</p>
              <p className="text-xs text-muted-foreground">Please try again later.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

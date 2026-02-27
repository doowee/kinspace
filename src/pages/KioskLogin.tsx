import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStudio } from "@/contexts/StudioContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Delete, Fingerprint } from "lucide-react";

export default function KioskLogin() {
  const navigate = useNavigate();
  const { activeStudio } = useStudio();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleDigit = useCallback((digit: string) => {
    if (loading) return;
    setPin((prev) => {
      if (prev.length >= 4) return prev;
      return prev + digit;
    });
  }, [loading]);

  const handleDelete = useCallback(() => {
    if (loading) return;
    setPin((prev) => prev.slice(0, -1));
  }, [loading]);

  // Auto-submit on 4th digit
  useEffect(() => {
    if (pin.length !== 4) return;

    const verify = async () => {
      if (!activeStudio) {
        toast.error("No studio selected");
        setPin("");
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("kiosk-pin-login", {
          body: { pin_code: pin, studio_id: activeStudio.id },
        });

        if (error || data?.error) {
          setShake(true);
          setTimeout(() => setShake(false), 600);
          setPin("");
          toast.error("Invalid PIN. Try again.");
        } else {
          toast.success(`Welcome, ${data.instructor_name}!`);
          if (data.next_class) {
            navigate(`/kiosk/live/${data.next_class.id}?instructor=${data.instructor_id}&name=${encodeURIComponent(data.instructor_name)}`);
          } else {
            toast.info("No upcoming classes found.");
            setPin("");
          }
        }
      } catch {
        toast.error("Connection error");
        setPin("");
      }
      setLoading(false);
    };

    verify();
  }, [pin, activeStudio, navigate]);

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Studio name */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Fingerprint className="h-10 w-10 text-primary" />
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Enter Kiosk PIN
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          {activeStudio?.name ?? "Studio Kiosk"}
        </p>
      </div>

      {/* PIN dots */}
      <div
        className={cn(
          "flex gap-5 mb-12 transition-transform",
          shake && "animate-[shake_0.5s_ease-in-out]"
        )}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-6 w-6 rounded-full border-2 transition-all duration-200",
              i < pin.length
                ? "bg-primary border-primary scale-110"
                : "border-muted-foreground/30"
            )}
          />
        ))}
      </div>

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-4 max-w-[360px] w-full">
        {digits.map((d, i) => {
          if (d === "") return <div key={i} />;
          if (d === "del") {
            return (
              <Button
                key={i}
                variant="ghost"
                className="h-20 w-full text-2xl rounded-2xl"
                onClick={handleDelete}
                disabled={loading || pin.length === 0}
              >
                <Delete className="h-7 w-7" />
              </Button>
            );
          }
          return (
            <Button
              key={i}
              variant="outline"
              className="h-20 w-full text-3xl font-semibold rounded-2xl hover:bg-muted/50 active:scale-95 transition-transform"
              onClick={() => handleDigit(d)}
              disabled={loading}
            >
              {d}
            </Button>
          );
        })}
      </div>

      {loading && (
        <p className="mt-8 text-muted-foreground animate-pulse text-lg">Verifying…</p>
      )}

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
          20%, 40%, 60%, 80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}

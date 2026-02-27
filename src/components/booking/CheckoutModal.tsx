import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Lock,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  CreditCard,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemPrice: string;
  /** numeric price in the studio's currency (e.g. 99.00) */
  amount: number;
  currency?: string;
  studioId: string;
  studioName: string;
  studioSlug?: string;
}

export default function CheckoutModal({
  open,
  onOpenChange,
  itemName,
  itemPrice,
  amount,
  currency = "usd",
  studioId,
  studioName,
  studioSlug,
}: CheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-client-payment", {
        body: {
          packageName: itemName,
          amount,
          currency,
          studioId,
          studioName,
          studioSlug,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("No checkout URL returned");
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <div className="animate-fade-in">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="font-display text-xl">
              Complete Purchase
            </DialogTitle>
            <DialogDescription>
              Secure checkout for {studioName}
            </DialogDescription>
          </DialogHeader>

          {/* Purchase Summary */}
          <div className="mx-6 rounded-lg bg-muted/50 p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground text-sm">{itemName}</p>
              <p className="text-xs text-muted-foreground">One-time purchase</p>
            </div>
            <span className="font-display text-xl font-bold text-foreground">
              {itemPrice}
            </span>
          </div>

          <div className="p-6 space-y-4">
            {/* Checkout Button */}
            <Button
              className="w-full h-12 text-base font-medium gap-2"
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redirecting to secure checkout…
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  Pay {itemPrice}
                </>
              )}
            </Button>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3 text-xs">
                <ShieldCheck className="h-3.5 w-3.5" />
                Apple Pay & Google Pay accepted
              </Badge>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span>
                Secured by Stripe. Your card is vaulted across all studio
                locations for seamless future bookings.
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

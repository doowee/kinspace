import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Lock,
  CreditCard,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemPrice: string;
  studioName: string;
}

type CheckoutStep = "payment" | "processing" | "success";

export default function CheckoutModal({
  open,
  onOpenChange,
  itemName,
  itemPrice,
  studioName,
}: CheckoutModalProps) {
  const [step, setStep] = useState<CheckoutStep>("payment");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [zip, setZip] = useState("");

  const handleSubmit = () => {
    setStep("processing");
    setTimeout(() => setStep("success"), 2000);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after animation
    setTimeout(() => {
      setStep("payment");
      setCardNumber("");
      setExpiry("");
      setCvc("");
      setZip("");
    }, 300);
  };

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {step === "payment" && (
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
              {/* Express Pay Buttons */}
              <div className="space-y-2">
                <Button
                  className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 font-medium text-base gap-2"
                  onClick={handleSubmit}
                >
                  <Smartphone className="h-5 w-5" />
                  Pay with Apple Pay / Google Pay
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-11 gap-2 text-sm font-medium"
                  onClick={handleSubmit}
                >
                  <Zap className="h-4 w-4" />
                  Pay with Link — 1-click checkout
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  or pay with card
                </span>
                <Separator className="flex-1" />
              </div>

              {/* Card Form */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="card-number" className="text-xs font-medium">
                    Card Number
                  </Label>
                  <div className="relative mt-1">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="card-number"
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={(e) =>
                        setCardNumber(formatCardNumber(e.target.value))
                      }
                      className="pl-10 font-mono tracking-wider"
                      maxLength={19}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="expiry" className="text-xs font-medium">
                      Expiration
                    </Label>
                    <Input
                      id="expiry"
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={(e) =>
                        setExpiry(formatExpiry(e.target.value))
                      }
                      className="mt-1 font-mono"
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvc" className="text-xs font-medium">
                      CVC
                    </Label>
                    <Input
                      id="cvc"
                      placeholder="123"
                      value={cvc}
                      onChange={(e) =>
                        setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      className="mt-1 font-mono"
                      maxLength={4}
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip" className="text-xs font-medium">
                      ZIP
                    </Label>
                    <Input
                      id="zip"
                      placeholder="10001"
                      value={zip}
                      onChange={(e) =>
                        setZip(e.target.value.replace(/\D/g, "").slice(0, 5))
                      }
                      className="mt-1 font-mono"
                      maxLength={5}
                    />
                  </div>
                </div>
              </div>

              <Button
                className="w-full h-12 text-base font-medium"
                disabled={
                  cardNumber.length < 19 ||
                  expiry.length < 5 ||
                  cvc.length < 3 ||
                  zip.length < 5
                }
                onClick={handleSubmit}
              >
                Pay {itemPrice}
              </Button>

              {/* Trust Badge */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
                <Lock className="h-3 w-3" />
                <span>
                  Secured by Stripe. Your card is vaulted across all our studio
                  locations for seamless future bookings.
                </span>
              </div>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="p-10 space-y-6 animate-fade-in">
            <div className="space-y-4">
              <Skeleton className="h-5 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-4 w-2/3 mx-auto" />
            </div>
            <p className="text-center text-sm text-muted-foreground animate-pulse">
              Processing your payment…
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="p-8 text-center space-y-5 animate-fade-in">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-2xl font-bold text-foreground">
                Payment Successful!
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                We've securely saved your profile so you can refill via text
                message next time.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Badge
                variant="outline"
                className="gap-1.5 py-1.5 px-3 text-xs"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Card vaulted across all locations
              </Badge>
            </div>
            <Button className="w-full h-11" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

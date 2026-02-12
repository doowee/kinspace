import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { addDays } from "date-fns";

interface Member {
  user_id: string;
  profiles: { id: string; first_name: string | null; last_name: string | null; email: string } | null;
}

interface Package {
  id: string;
  name: string;
  price: number;
  credits: number;
  expiration_days: number;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "transfer", label: "Venmo / Transfer" },
  { value: "check", label: "Check" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  onSuccess: () => void;
}

export default function RecordPaymentModal({ open, onOpenChange, studioId, onSuccess }: Props) {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [userId, setUserId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      supabase
        .from("studio_members")
        .select("user_id, profiles ( id, first_name, last_name, email )")
        .eq("studio_id", studioId),
      supabase
        .from("packages")
        .select("id, name, price, credits, expiration_days")
        .eq("studio_id", studioId)
        .eq("active", true),
    ]).then(([memberRes, pkgRes]) => {
      if (memberRes.data) setMembers(memberRes.data as unknown as Member[]);
      if (pkgRes.data) setPackages(pkgRes.data);
    });
  }, [open, studioId]);

  const selectedPkg = packages.find((p) => p.id === packageId);

  const reset = () => {
    setUserId("");
    setPackageId("");
    setPaymentMethod("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !packageId || !paymentMethod || !selectedPkg) return;

    setSaving(true);

    // A: Insert transaction
    const { error: txError } = await supabase.from("transactions").insert({
      studio_id: studioId,
      user_id: userId,
      amount: selectedPkg.price,
      payment_method: paymentMethod as "cash" | "card" | "transfer" | "check",
      description: selectedPkg.name,
      status: "completed" as const,
    });

    if (txError) {
      toast({ title: "Error", description: txError.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // B + C: Insert student pass with calculated expiration
    const expiresAt = addDays(new Date(), selectedPkg.expiration_days).toISOString();

    const { error: passError } = await supabase.from("student_passes").insert({
      user_id: userId,
      studio_id: studioId,
      package_id: selectedPkg.id,
      credits_remaining: selectedPkg.credits,
      expires_at: expiresAt,
    });

    if (passError) {
      toast({ title: "Payment recorded but pass failed", description: passError.message, variant: "destructive" });
    } else {
      toast({ title: "Payment recorded & credits granted", description: `${selectedPkg.credits} credits added` });
    }

    reset();
    onOpenChange(false);
    onSuccess();
    setSaving(false);
  };

  const memberLabel = (m: Member) => {
    const p = m.profiles;
    if (!p) return m.user_id;
    const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
    return name || p.email;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Offline Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Student</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {memberLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Package</Label>
            <Select value={packageId} onValueChange={setPackageId}>
              <SelectTrigger>
                <SelectValue placeholder="Select package" />
              </SelectTrigger>
              <SelectContent>
                {packages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.name} — ${pkg.price} ({pkg.credits} credits)
                  </SelectItem>
                ))}
                {packages.length === 0 && (
                  <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                    No active packages. Create one in Settings.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedPkg && (
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p><span className="font-medium">Amount:</span> ${selectedPkg.price}</p>
              <p><span className="font-medium">Credits:</span> {selectedPkg.credits}</p>
              <p><span className="font-medium">Expires:</span> {selectedPkg.expiration_days} days from today</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((pm) => (
                  <SelectItem key={pm.value} value={pm.value}>
                    {pm.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !userId || !packageId || !paymentMethod}
            >
              {saving ? "Processing…" : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

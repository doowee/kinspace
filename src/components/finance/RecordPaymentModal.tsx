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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Member {
  user_id: string;
  profiles: { id: string; first_name: string | null; last_name: string | null; email: string } | null;
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
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("studio_members")
      .select("user_id, profiles ( id, first_name, last_name, email )")
      .eq("studio_id", studioId)
      .then(({ data }) => {
        if (data) setMembers(data as unknown as Member[]);
      });
  }, [open, studioId]);

  const reset = () => {
    setUserId("");
    setAmount("");
    setDescription("");
    setPaymentMethod("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!userId || isNaN(numAmount) || numAmount <= 0 || !paymentMethod) return;
    if (description.length > 500) {
      toast({ title: "Description too long", description: "Max 500 characters.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("transactions").insert({
      studio_id: studioId,
      user_id: userId,
      amount: numAmount,
      payment_method: paymentMethod as "cash" | "card" | "transfer" | "check",
      description: description.trim() || null,
      status: "completed" as const,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Payment recorded" });
      reset();
      onOpenChange(false);
      onSuccess();
    }
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
            <Label>Amount ($)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max="999999"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Drop-in Class"
              maxLength={500}
            />
          </div>

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
              disabled={saving || !userId || !amount || !paymentMethod}
            >
              {saving ? "Saving…" : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Send, Mail, MessageSquare, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const OWNER_TEMPLATES = [
  { label: "Class Room Change", text: "Heads up! Today's class has moved to Studio B. See you there! 🏠" },
  { label: "Bring a Towel", text: "Reminder: Please bring a towel and water bottle to class today! 💧" },
  { label: "Instructor Sub Alert", text: "Quick update — today's class will be led by a guest instructor. Same great energy! ⚡" },
];

const INSTRUCTOR_TEMPLATES = [
  { emoji: "⚠️", label: "Studio Room Change", text: "Heads up! Today's class has moved to a different room. Check the front desk for details! 🏠" },
  { emoji: "⏱️", label: "I'm running 5 minutes late!", text: "Hey everyone — I'm running about 5 minutes late today. Please start warming up and I'll be right there! 🙏" },
  { emoji: "🧦", label: "Reminder: Bring your grip socks!", text: "Friendly reminder: Please bring your grip socks to class today! We can't allow bare feet on the equipment. 🧦" },
];

interface MessageClassDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  studentCount: number;
  role?: string | null;
}

export default function MessageClassDrawer({ open, onOpenChange, className: clsName, studentCount, role }: MessageClassDrawerProps) {
  const isInstructor = role === "instructor";
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = () => {
    if (!message.trim()) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast({
        title: "Message sent!",
        description: `${channel === "sms" ? "SMS" : "Email"} delivered to ${studentCount} student${studentCount !== 1 ? "s" : ""}.`,
      });
      setMessage("");
      onOpenChange(false);
    }, 800);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-display flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Message Class
          </SheetTitle>
          <SheetDescription>
            Broadcast to <span className="font-semibold text-foreground">{clsName}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 pt-4">
          {/* Channel selector — owners get both, instructors default SMS only */}
          {!isInstructor ? (
            <div className="flex gap-1 rounded-lg border bg-muted/50 p-1">
              <button
                onClick={() => setChannel("sms")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  channel === "sms"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                SMS
              </button>
              <button
                onClick={() => setChannel("email")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  channel === "email"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Mail className="h-3.5 w-3.5" />
                Email
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span>Channel: <span className="font-medium text-foreground">SMS</span></span>
            </div>
          )}

          {/* Audience counter */}
          <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
            <Megaphone className="h-4 w-4 shrink-0" />
            Sending to <span className="font-semibold text-foreground">{studentCount}</span> registered student{studentCount !== 1 && "s"}.
          </div>

          {/* ========== INSTRUCTOR VIEW: Template-only grid ========== */}
          {isInstructor ? (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span>For security, instructors may only send pre-approved logistical updates.</span>
              </div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pre-Approved Messages</p>
              <div className="grid gap-2">
                {INSTRUCTOR_TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => setMessage(t.text)}
                    className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors ${
                      message === t.text
                        ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                        : "border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <span className="font-medium">{t.emoji} {t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ========== OWNER VIEW: Templates + free-text ========== */
            <>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quick Templates</p>
                <div className="flex flex-wrap gap-1.5">
                  {OWNER_TEMPLATES.map((t) => (
                    <Badge
                      key={t.label}
                      variant="outline"
                      className="cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground"
                      onClick={() => setMessage(t.text)}
                    >
                      {t.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Type your ${channel === "sms" ? "SMS" : "email"} message…`}
                rows={5}
                className="resize-none"
              />
            </>
          )}
        </div>

        {/* Send button */}
        <div className="pt-4 border-t mt-auto">
          <Button
            className="w-full gap-2"
            onClick={handleSend}
            disabled={!message.trim() || sending}
          >
            <Send className="h-4 w-4" />
            {sending ? "Sending…" : `Send ${isInstructor ? "SMS" : channel === "sms" ? "SMS" : "Email"}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

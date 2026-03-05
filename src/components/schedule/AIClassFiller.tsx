import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, Sparkles, Users, Clock, UserPlus, Rocket } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AIClassFillerProps {
  classId: string;
  className: string;
  capacity: number;
  bookedCount: number;
  classStartTime?: string;
  isPro: boolean;
}

const SEGMENTS = [
  { id: "fan-club", label: "The Fan Club", desc: "Previous students of this instructor/class", icon: Users },
  { id: "slipping", label: "Slipping Away", desc: "Active package, no bookings in 14 days", icon: Clock },
  { id: "drop-ins", label: "Drop-ins", desc: "Past visitors with no active package", icon: UserPlus },
] as const;

const TONES = [
  { value: "friendly", label: "Friendly Reminder" },
  { value: "discount", label: "Last-Minute 10% Discount" },
  { value: "friend-pass", label: "Bring a Friend Pass" },
] as const;

type SegmentId = typeof SEGMENTS[number]["id"];
type ToneId = typeof TONES[number]["value"];

function getMockContent(segment: SegmentId, tone: ToneId, className: string) {
  const openers: Record<SegmentId, string> = {
    "fan-club": "Hey! We noticed you loved",
    slipping: "We miss you at",
    "drop-ins": "Remember that amazing class at",
  };
  const offers: Record<ToneId, string> = {
    friendly: "There's a spot with your name on it — book now before it fills up! 💛",
    discount: "Here's an exclusive 10% off to get you back on the reformer. Use code LASTSPOT. ⚡",
    "friend-pass": "Bring a friend for FREE this time — double the fun, double the burn! 🔥",
  };
  return {
    email: {
      subject: tone === "discount" ? `⚡ 10% off ${className} — today only` : `A spot just opened in ${className}!`,
      body: `${openers[segment]} ${className}?\n\n${offers[tone]}\n\nSee you on the mat,\nYour Studio Team`,
    },
    sms: `${openers[segment]} ${className}? ${offers[tone]}`,
  };
}

function ConfettiOverlay() {
  const dots = Array.from({ length: 24 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
      {dots.map((_, i) => {
        const left = `${Math.random() * 100}%`;
        const delay = `${Math.random() * 0.4}s`;
        const hue = Math.floor(Math.random() * 360);
        return (
          <span
            key={i}
            className="absolute top-0 block h-2 w-2 rounded-full opacity-0"
            style={{
              left,
              backgroundColor: `hsl(${hue} 80% 60%)`,
              animation: `confetti-fall 1.2s ${delay} ease-out forwards`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confetti-fall {
          0% { opacity: 1; transform: translateY(0) rotate(0deg) scale(1); }
          100% { opacity: 0; transform: translateY(260px) rotate(720deg) scale(0.4); }
        }
      `}</style>
    </div>
  );
}

export default function AIClassFiller({ classId, className, capacity, bookedCount, classStartTime, isPro }: AIClassFillerProps) {
  const [segment, setSegment] = useState<SegmentId | null>(null);
  const [tone, setTone] = useState<ToneId | null>(null);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<ReturnType<typeof getMockContent> | null>(null);
  const [deployed, setDeployed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const emptySpots = capacity - bookedCount;

  // Visibility: only show if there are empty spots AND class is within 48h
  const isWithin48h = useMemo(() => {
    if (!classStartTime) return false;
    const diff = new Date(classStartTime).getTime() - Date.now();
    return diff > 0 && diff <= 48 * 60 * 60 * 1000;
  }, [classStartTime]);

  if (emptySpots <= 0 || !isWithin48h) return null;

  const targetCount = segment === "fan-club" ? 8 : segment === "slipping" ? 5 : 12;

  const handleGenerate = () => {
    if (!segment || !tone) return;
    setGenerating(true);
    setPreview(null);
    setTimeout(() => {
      setPreview(getMockContent(segment, tone, className));
      setGenerating(false);
    }, 2000);
  };

  const handleDeploy = () => {
    setShowConfetti(true);
    setDeployed(true);
    toast({ title: "🚀 AI Agent deployed!", description: "Watch the bookings roll in." });
    setTimeout(() => setShowConfetti(false), 1500);
  };

  // Locked state
  if (!isPro) {
    return (
      <button
        className="relative w-full rounded-xl border border-dashed border-violet-300/50 p-4 text-left"
        onClick={() =>
          toast({
            title: "Upgrade to Premium",
            description: "Let our AI automatically fill your empty reformer beds.",
          })
        }
      >
        <div className="pointer-events-none select-none opacity-40 blur-[1px] flex flex-col gap-1">
          <p className="text-sm font-semibold">🪄 AI Class Filler</p>
          <p className="text-xs text-muted-foreground">{emptySpots} spot{emptySpots > 1 ? "s" : ""} to fill — let AI do the work</p>
        </div>
        <div className="absolute inset-0 flex items-center justify-center gap-2">
          <Lock className="h-4 w-4 text-violet-500" />
          <Badge className="bg-violet-500 text-white text-[10px] border-0">Pro</Badge>
        </div>
      </button>
    );
  }

  // Unlocked state
  return (
    <Card className="relative border-violet-400/40 bg-violet-50/30 dark:bg-violet-950/10 overflow-hidden">
      {showConfetti && <ConfettiOverlay />}
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <p className="text-sm font-semibold">🪄 AI Class Filler</p>
          <Badge variant="outline" className="ml-auto text-[10px] border-violet-300 text-violet-600">
            {emptySpots} spot{emptySpots > 1 ? "s" : ""} open
          </Badge>
        </div>

        {/* Step 1: Segment */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">1. Target Segment</p>
          <div className="grid gap-1.5">
            {SEGMENTS.map((s) => {
              const Icon = s.icon;
              const active = segment === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => { setSegment(s.id); setPreview(null); setDeployed(false); }}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    active
                      ? "border-violet-400 bg-violet-100/60 dark:bg-violet-900/20"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${active ? "text-violet-600" : "text-muted-foreground"}`} />
                  <div>
                    <span className={`font-medium ${active ? "text-violet-700 dark:text-violet-300" : ""}`}>{s.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{s.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Tone */}
        {segment && (
          <div className="space-y-2 animate-fade-in">
            <p className="text-xs font-medium text-muted-foreground">2. Offer / Tone</p>
            <Select value={tone ?? ""} onValueChange={(v) => { setTone(v as ToneId); setPreview(null); setDeployed(false); }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Choose a tone…" />
              </SelectTrigger>
              <SelectContent>
                {TONES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Step 3: Generate & Preview */}
        {segment && tone && !preview && !generating && (
          <Button
            size="sm"
            className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white animate-fade-in"
            onClick={handleGenerate}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate Campaign
          </Button>
        )}

        {generating && (
          <div className="space-y-2 animate-fade-in">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {preview && (
          <div className="space-y-3 animate-fade-in">
            <div className="rounded-lg border border-violet-200/60 dark:border-violet-700/30 p-3 space-y-1">
              <p className="text-[10px] font-bold uppercase text-violet-500 tracking-wider">Email Preview</p>
              <p className="text-xs font-semibold">{preview.email.subject}</p>
              <p className="text-xs text-muted-foreground whitespace-pre-line">{preview.email.body}</p>
            </div>
            <div className="rounded-lg border border-violet-200/60 dark:border-violet-700/30 p-3 space-y-1">
              <p className="text-[10px] font-bold uppercase text-violet-500 tracking-wider">SMS Preview</p>
              <p className="text-xs text-muted-foreground">{preview.sms}</p>
            </div>

            {/* Step 4: Deploy */}
            {!deployed ? (
              <Button
                size="sm"
                className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white"
                onClick={handleDeploy}
              >
                <Rocket className="h-3.5 w-3.5" />
                🚀 Deploy to {targetCount} Students
              </Button>
            ) : (
              <p className="text-center text-xs font-medium text-violet-600 animate-fade-in">
                ✅ Campaign deployed to {targetCount} students
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { motion, AnimatePresence, type Variants, type Easing } from "framer-motion";
import { ArrowRight, MessageSquare, Check, Zap, Brain, Shield, Globe, Users, Lock, Sparkles, RefreshCw, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const EASE: Easing = [0.25, 0.1, 0.25, 1];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE } },
};

const fadeRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE } },
};

const stagger: Variants = {
  visible: { transition: { staggerChildren: 0.12 } },
};

const VP = { once: true, margin: "-100px" as any };

function BrandName() {
  return (
    <span className="font-display">
      <span className="font-bold">Kinspace</span>
      <span className="font-normal opacity-70">.Studio</span>
    </span>
  );
}

function WaitlistForm({ buttonText = "Join the US Beta Waitlist" }: { buttonText?: string }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    toast.success("You're on the list! Keep an eye on your inbox.");
    setEmail("");
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
      <Input
        type="email"
        placeholder="Enter your email..."
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="h-12 bg-card border-border/60 text-foreground placeholder:text-muted-foreground"
      />
      <Button type="submit" size="lg" className="h-12 px-6 whitespace-nowrap gap-2">
        {submitted ? (
          <>
            <Check className="h-4 w-4" /> You're in!
          </>
        ) : (
          <>
            {buttonText} <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}

/* ─── Mockup Cards ─── */

function WaitlistSMSMockup() {
  return (
    <div className="rounded-2xl bg-card border border-border/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-5 max-w-xs mx-auto">
      <div className="text-xs text-muted-foreground mb-3 font-medium tracking-wide uppercase">SMS · Today 2:04 AM</div>
      <div className="space-y-2.5">
        <div className="rounded-xl bg-muted px-3.5 py-2.5 text-sm text-foreground">
          GOOD NEWS: A spot opened in 6pm Reformer! Reply YES to claim it.
        </div>
        <div className="rounded-xl bg-primary text-primary-foreground px-3.5 py-2.5 text-sm ml-auto w-fit">YES</div>
        <div className="rounded-xl bg-muted px-3.5 py-2.5 text-sm text-foreground">
          You're booked! 🎉 See you at 6pm tonight.
        </div>
      </div>
    </div>
  );
}

function RefillSMSMockup() {
  return (
    <div className="rounded-2xl bg-card border border-border/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-5 max-w-xs mx-auto">
      <div className="text-xs text-muted-foreground mb-3 font-medium tracking-wide uppercase">SMS · Today 8:15 AM</div>
      <div className="space-y-2.5">
        <div className="rounded-xl bg-muted px-3.5 py-2.5 text-sm text-foreground">
          Hey Sarah! You're down to 1 credit. Reply REFILL to grab a 10-class pack for <span className="font-semibold">$199</span>.
        </div>
        <div className="rounded-xl bg-primary text-primary-foreground px-3.5 py-2.5 text-sm ml-auto w-fit">REFILL</div>
        <div className="rounded-xl bg-muted px-3.5 py-2.5 text-sm text-foreground">
          Done! 💳 Your card ending •4821 has been charged <span className="font-semibold">$199</span>. 10 credits added. You're all set!
        </div>
      </div>
    </div>
  );
}

function StackedSMSMockups() {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative mx-auto cursor-pointer select-none flex items-center justify-center"
      style={{ width: 380, height: 320 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => setHovered((h) => !h)}
    >
      {/* Back card */}
      <motion.div
        animate={{
          x: hovered ? -50 : 50,
          y: hovered ? -20 : 20,
          scale: hovered ? 1 : 0.97,
          zIndex: hovered ? 10 : 0,
          opacity: hovered ? 1 : 0.7,
        }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="absolute"
        style={{ filter: hovered ? 'none' : 'brightness(0.96)' }}
      >
        <div className="shadow-[0_12px_40px_rgb(0,0,0,0.12)] rounded-2xl">
          <RefillSMSMockup />
        </div>
      </motion.div>

      {/* Front card */}
      <motion.div
        animate={{
          x: hovered ? 50 : -50,
          y: hovered ? 20 : -20,
          scale: hovered ? 0.97 : 1,
          zIndex: hovered ? 0 : 10,
          opacity: hovered ? 0.7 : 1,
        }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="absolute"
        style={{ filter: hovered ? 'brightness(0.96)' : 'none' }}
      >
        <div className="shadow-[0_12px_40px_rgb(0,0,0,0.12)] rounded-2xl">
          <WaitlistSMSMockup />
        </div>
      </motion.div>

      <div className="absolute -bottom-2 inset-x-0 text-center text-[11px] text-muted-foreground/60">
        Hover to swap
      </div>
    </div>
  );
}

function AIMarketingMockup() {
  return (
    <div className="rounded-2xl bg-card border border-border/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-5 max-w-xs mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="font-display font-bold text-foreground text-sm">AI Marketing Hub</div>
        <div className="text-[10px] px-2 py-0.5 rounded-full bg-sage/20 text-sage font-medium">Live</div>
      </div>
      <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 mb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-foreground">Thu 6 AM · Reformer Flow</div>
            <div className="text-[10px] text-muted-foreground">Only 3 of 12 spots filled</div>
          </div>
          <div className="text-xs text-destructive font-semibold">25%</div>
        </div>
      </div>
      <div className="rounded-lg bg-muted/60 p-3 mb-3 space-y-2">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">AI-Generated Email</div>
        <div className="text-xs text-foreground leading-relaxed">
          "Hi [First Name], Sarah's Thursday morning Reformer is calling your name — and we saved your favorite reformer..."
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium text-center py-2">Send to 42 clients</div>
        <div className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">Edit</div>
      </div>
      <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2.5 flex items-center gap-2">
        <HelpCircle className="h-3 w-3 text-sage shrink-0" />
        <span className="text-[11px] text-muted-foreground italic">"Who were my top 3 instructors last month?"</span>
      </div>
    </div>
  );
}

function EmpireMockup() {
  return (
    <div className="rounded-2xl bg-card border border-border/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-5 max-w-xs mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="font-display font-bold text-foreground text-sm">Multi-Studio Overview</div>
        <div className="text-[10px] text-muted-foreground">3 Locations</div>
      </div>
      <div className="space-y-2 mb-4">
        {[
          { name: "Downtown", revenue: "$8,420", fill: "94%", color: "bg-sage" },
          { name: "Uptown", revenue: "$6,180", fill: "87%", color: "bg-primary" },
          { name: "Westside", revenue: "$4,320", fill: "72%", color: "bg-secondary" },
        ].map((loc) => (
          <div key={loc.name} className="rounded-lg bg-muted/60 px-3 py-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${loc.color}`} />
                <span className="text-xs font-medium text-foreground">{loc.name}</span>
              </div>
              <span className="text-xs font-bold text-foreground">{loc.revenue}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full ${loc.color}`} style={{ width: loc.fill }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">Fill Rate</span>
              <span className="text-[10px] text-foreground font-medium">{loc.fill}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border px-3 py-2 flex items-center justify-between">
        <span className="text-xs text-foreground font-medium">Total Revenue</span>
        <span className="text-sm font-bold text-foreground">$18,920</span>
      </div>
    </div>
  );
}

/* ─── Hero Mockup ─── */
function HeroMockup() {
  return (
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      className="relative"
    >
      <div className="rounded-2xl bg-card border border-border/60 shadow-[0_20px_60px_rgb(0,0,0,0.08)] p-6 max-w-sm mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">K.S</div>
          <div className="font-display font-bold text-foreground">Kinspace.Studio</div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Revenue", value: "$12.4k" },
            { label: "Bookings", value: "184" },
            { label: "Fill Rate", value: "92%" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-muted/60 p-2.5 text-center">
              <div className="text-sm font-bold text-foreground">{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="h-2 rounded-full bg-primary/20 overflow-hidden">
            <div className="h-full w-[92%] rounded-full bg-primary" />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Monthly Goal</span>
            <span className="text-primary font-medium">92%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Feature Block ─── */
function FeatureBlock({
  eyebrow,
  title,
  body,
  bullets,
  mockup,
  reverse,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  bullets: { icon: React.ReactNode; label: string; text: string }[];
  mockup: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={VP}
      variants={stagger}
      className={`flex flex-col ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-12 lg:gap-20`}
    >
      <motion.div variants={fadeUp} className="flex-1 space-y-5">
        {eyebrow && (
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-sage">{eyebrow}</p>
        )}
        <h3 className="font-display text-3xl lg:text-4xl font-bold text-foreground">{title}</h3>
        {body && (
          <p className="text-muted-foreground leading-relaxed">{body}</p>
        )}
        <motion.ul variants={stagger} className="space-y-4 pt-1">
          {bullets.map((b, i) => (
            <motion.li key={i} variants={fadeUp} className="flex items-start gap-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage/15 text-sage">
                {b.icon}
              </span>
              <span className="text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">{b.label}</span> {b.text}
              </span>
            </motion.li>
          ))}
        </motion.ul>
      </motion.div>
      <motion.div variants={reverse ? fadeLeft : fadeRight} className="flex-1 flex justify-center">
        {mockup}
      </motion.div>
    </motion.div>
  );
}

/* ─── Page ─── */
export default function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <div className="text-xl">
            <BrandName />
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/auth">Sign In</a>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-20 lg:py-32">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="flex-1 space-y-6"
          >
            <motion.p variants={fadeLeft} className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
              The Modern Studio Operating System
            </motion.p>
            <motion.h1 variants={fadeLeft} className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] text-foreground">
              Stop working for your software. Start growing your empire.
            </motion.h1>
            <motion.p variants={fadeLeft} className="text-lg text-muted-foreground max-w-lg leading-relaxed">
              Kinspace.Studio is the invisible engine for premium boutique fitness. We recover lost revenue, automate your staff, and keep your clients in your ecosystem.
            </motion.p>
            <motion.div variants={fadeLeft}>
              <WaitlistForm />
            </motion.div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="flex-1 flex justify-center"
          >
            <HeroMockup />
          </motion.div>
        </div>
      </section>

      {/* Agitator */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={VP}
        variants={{
          hidden: { opacity: 0, scale: 0.96 },
          visible: { opacity: 1, scale: 1, transition: { duration: 0.6 } },
        }}
        className="bg-muted/50"
      >
        <div className="container py-20 lg:py-28 text-center max-w-3xl mx-auto space-y-5">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            You are paying software companies to steal your brand equity.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Right now, your clients have to download a generic app and search past your competitors just to book a reformer. It's time to upgrade.
          </p>
        </div>
      </motion.section>

      {/* Features */}
      <section className="container py-20 lg:py-28 space-y-24 lg:space-y-32">
        <FeatureBlock
          eyebrow="MAKE MONEY WHILE YOU SLEEP"
          title="Frictionless Commerce."
          body="Don't rely on your clients remembering their passwords. We turn 2 AM cancellations into revenue and empty reformers into flash sales automatically."
          bullets={[
            { icon: <Zap className="h-3.5 w-3.5" />, label: "The Smart Waitlist:", text: "Spot opens up? We text the waitlist and charge the card instantly." },
            { icon: <RefreshCw className="h-3.5 w-3.5" />, label: "1-Tap Refills:", text: 'Clients reply "REFILL" at a red light to buy a 10-pack. Zero logins.' },
            { icon: <Sparkles className="h-3.5 w-3.5" />, label: "Flash Deals:", text: "Monetize dead space by texting drop-in clients 50% off last-minute empty spots." },
          ]}
          mockup={<StackedSMSMockups />}
        />
        <FeatureBlock
          eyebrow="YOUR INVISIBLE OPERATIONS MANAGER"
          title="The AI Auto-Marketer."
          body="Stop staring at a blank screen trying to figure out how to fill your Thursday morning classes. Kinspace.Studio's AI actively monitors your schedule and does the heavy lifting for you."
          bullets={[
            { icon: <Brain className="h-3.5 w-3.5" />, label: "Automated Copywriting:", text: "The AI identifies low-attendance classes and instantly drafts highly-targeted promotional emails." },
            { icon: <Shield className="h-3.5 w-3.5" />, label: "SmartCover:", text: "Instructors request shift coverage, and the system automatically manages the swapping and updates the schedule." },
            { icon: <HelpCircle className="h-3.5 w-3.5" />, label: "Ask Your Data:", text: 'Type questions into your dashboard like "Who were my top 3 instructors last month?" for instant, plain-English answers.' },
          ]}
          mockup={<AIMarketingMockup />}
          reverse
        />
        <FeatureBlock
          eyebrow="BUILT FOR FRANCHISES & AMBITIOUS OWNERS"
          title="Run your Mini-Empire."
          body="Whether you are opening your second studio or your tenth, Kinspace scales flawlessly without the administrative nightmare."
          bullets={[
            { icon: <Globe className="h-3.5 w-3.5" />, label: "One Global Login:", text: "No more logging in and out to manage different locations." },
            { icon: <Users className="h-3.5 w-3.5" />, label: "Unified Client Profiles:", text: "A client buys a pack downtown, they can use it uptown seamlessly." },
            { icon: <Lock className="h-3.5 w-3.5" />, label: "Role-Based Access:", text: "Instant privacy toggles so your front desk only sees what they need to see, while you see the global revenue." },
          ]}
          mockup={<EmpireMockup />}
        />
      </section>

      {/* Footer CTA */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={VP}
        variants={fadeUp}
        className="bg-muted/50"
      >
        <div className="container py-20 lg:py-28">
          <div className="mx-auto max-w-2xl rounded-2xl bg-card border border-border/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-8 sm:p-12 text-center space-y-5">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              The era of clunky fitness software is over.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We are onboarding a strictly limited cohort of premium US studios for our Q3 Beta launch. Secure your spot.
            </p>
            <div className="flex justify-center">
              <WaitlistForm buttonText="Request Beta Access" />
            </div>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-background">
        <div className="container flex items-center justify-center py-8 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} <BrandName /> · All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}

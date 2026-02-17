import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useInView, type Variants, type Easing } from "framer-motion";
import { ArrowRight, Check, X, Zap, Shield, Globe, Users, Lock, Sparkles, RefreshCw, Star } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

/* ─── Animation Presets ─── */
const EASE: Easing = [0.25, 0.1, 0.25, 1];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } }
};
const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE } }
};
const fadeRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE } }
};
const stagger: Variants = {
  visible: { transition: { staggerChildren: 0.12 } }
};
const VP = { once: true, margin: "-100px" as any };

/* ─── Shared UI ─── */

function DotGrid() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.35]"
      style={{
        backgroundImage: "radial-gradient(hsl(var(--foreground) / 0.15) 1px, transparent 1px)",
        backgroundSize: "24px 24px"
      }} />);


}

function AmbientGlow({ className = "" }: {className?: string;}) {
  return (
    <div
      className={`absolute rounded-full blur-[120px] pointer-events-none ${className}`}
      style={{
        background: "radial-gradient(circle, hsl(var(--sage) / 0.2) 0%, hsl(var(--terracotta) / 0.12) 50%, transparent 80%)"
      }} />);


}

function GlassCard({ children, className = "" }: {children: React.ReactNode;className?: string;}) {
  return (
    <div className={`rounded-2xl bg-card/80 backdrop-blur-md border border-card/20 shadow-[0_8px_30px_rgb(0,0,0,0.08)] ${className}`}>
      {children}
    </div>);

}

function BrandName() {
  return (
    <span className="font-display">
      <span className="font-bold">Kinspace</span>
      <span className="font-normal opacity-70">.Studio</span>
    </span>);

}

function WaitlistForm({ buttonText = "Join the US Beta Waitlist" }: {buttonText?: string;}) {
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
        className="h-12 bg-card/80 backdrop-blur-sm border-border/60 text-foreground placeholder:text-muted-foreground" />

      <Button type="submit" size="lg" className="h-12 px-6 whitespace-nowrap gap-2">
        {submitted ?
        <><Check className="h-4 w-4" /> You're in!</> :

        <>{buttonText} <ArrowRight className="h-4 w-4" /></>
        }
      </Button>
    </form>);

}

/* ─── Social Proof Marquee ─── */

const STUDIOS = [
"Uptown Pilates", "Flow State", "The Daily Reformer", "CoreHaus",
"Align Studio", "Barre & Beyond", "Reforma", "The Movement Lab",
"Stretch Studio", "Pure Reform", "Body Kinetic", "Studio Vibe"];


function Marquee() {
  return (
    <div className="overflow-hidden border-y border-border/30 bg-muted/30 py-5">
      <div className="flex animate-[marquee_40s_linear_infinite]">
        {[...STUDIOS, ...STUDIOS].map((name, i) =>
        <div
          key={i}
          className="mx-8 shrink-0 flex items-center gap-2 text-muted-foreground/40 select-none">

            <div className="h-6 w-6 rounded-md bg-muted-foreground/10 flex items-center justify-center text-[10px] font-bold text-muted-foreground/30">
              {name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </div>
            <span className="text-sm font-medium tracking-wide whitespace-nowrap">{name}</span>
          </div>
        )}
      </div>
    </div>);

}

/* ─── SMS Mockups ─── */

function WaitlistSMSMockup() {
  return (
    <GlassCard className="p-5 max-w-xs mx-auto">
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
    </GlassCard>);

}

function RefillSMSMockup() {
  return (
    <GlassCard className="p-5 max-w-xs mx-auto">
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
    </GlassCard>);

}

function StackedSMSMockups() {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="relative">
      <AmbientGlow className="w-[400px] h-[400px] -top-12 -left-12" />
      <div
        className="relative mx-auto cursor-pointer select-none flex items-center justify-center"
        style={{ width: 380, height: 320 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setHovered((h) => !h)}>

        <motion.div
          animate={{ x: hovered ? -50 : 50, y: hovered ? -20 : 20, scale: hovered ? 1 : 0.97, zIndex: hovered ? 10 : 0, opacity: hovered ? 1 : 0.7 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="absolute"
          style={{ filter: hovered ? "none" : "brightness(0.96)" }}>

          <RefillSMSMockup />
        </motion.div>
        <motion.div
          animate={{ x: hovered ? 50 : -50, y: hovered ? 20 : -20, scale: hovered ? 0.97 : 1, zIndex: hovered ? 0 : 10, opacity: hovered ? 0.7 : 1 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="absolute"
          style={{ filter: hovered ? "brightness(0.96)" : "none" }}>

          <WaitlistSMSMockup />
        </motion.div>
        <div className="absolute -bottom-2 inset-x-0 text-center text-[11px] text-muted-foreground/60">
          Hover to swap
        </div>
      </div>
    </div>);

}

/* ─── Bento Feature Mockups ─── */

function SMSCard({ label, children, className = "" }: {label: string;children: React.ReactNode;className?: string;}) {
  return (
    <GlassCard className={`p-3 space-y-1.5 w-[200px] ${className}`}>
      <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">{label}</div>
      {children}
    </GlassCard>);

}

function BentoSMSVisual() {
  return (
    <div className="relative">
      <AmbientGlow className="w-[400px] h-[400px] -top-8 -right-8" />
      <div className="relative grid grid-cols-2 gap-3 max-w-md mx-auto">
        {/* SMS Card 1 */}
        <SMSCard label="Smart Waitlist">
          <div className="rounded-2xl rounded-tl-sm bg-muted px-2.5 py-1.5 text-[11px] text-foreground leading-snug">
            Spot opened in 6pm Reformer! Reply YES 🎉
          </div>
          <div className="rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-2.5 py-1.5 text-[11px] ml-auto w-fit font-medium">
            YES
          </div>
          <div className="rounded-2xl rounded-tl-sm bg-muted px-2.5 py-1.5 text-[11px] text-foreground leading-snug">
            You're booked! See you at 6pm ✓
          </div>
        </SMSCard>

        {/* SMS Card 2 */}
        <SMSCard label="1-Tap Refill">
          <div className="rounded-2xl rounded-tl-sm bg-muted px-2.5 py-1.5 text-[11px] text-foreground leading-snug">
            1 credit left! Reply REFILL for a 10-pack ($199)
          </div>
          <div className="rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-2.5 py-1.5 text-[11px] ml-auto w-fit font-medium">
            REFILL
          </div>
          <div className="rounded-2xl rounded-tl-sm bg-muted px-2.5 py-1.5 text-[11px] text-foreground leading-snug">
            💳 $199 charged · 10 credits added ✓
          </div>
        </SMSCard>

        {/* SMS Card 3 */}
        <SMSCard label="Flash Deal">
          <div className="rounded-2xl rounded-tl-sm bg-muted px-2.5 py-1.5 text-[11px] text-foreground leading-snug">
            🔥 50% off 2pm Reformer! Reply CLAIM
          </div>
          <div className="rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-2.5 py-1.5 text-[11px] ml-auto w-fit font-medium">
            CLAIM
          </div>
          <div className="rounded-2xl rounded-tl-sm bg-muted px-2.5 py-1.5 text-[11px] text-foreground leading-snug">
            Booked for $7.50! See you at 2pm 🧘‍♀️
          </div>
        </SMSCard>

        {/* Photo */}
        <div className="rounded-2xl overflow-hidden shadow-[0_12px_40px_rgb(0,0,0,0.1)]">
          <img
            src="https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&h=600&fit=crop&crop=center"
            alt="Pilates studio"
            className="object-cover w-full h-full"
            loading="lazy" />

        </div>
      </div>
    </div>);

}

const AGENTS = [
  {
    icon: "DollarSign" as const,
    title: "The Revenue Agent",
    body: "Automatically texts your waitlist, processes 1-tap SMS class pack refills, and monetizes empty reformers with flash sales.",
  },
  {
    icon: "PenLine" as const,
    title: "The Marketing Agent",
    body: "Scans your schedule for low-attendance classes and automatically drafts highly-targeted, brand-perfect promotional emails.",
  },
  {
    icon: "BarChart3" as const,
    title: "The Business Agent",
    body: "Stop staring at spreadsheets. Ask plain-English questions about your financial trends, top-performing instructors, and client retention to get instant insights.",
  },
  {
    icon: "Handshake" as const,
    title: "The Support Agent",
    body: "An automated concierge to handle client FAQs, policy questions, and instructor shift-coverage without your front desk lifting a finger.",
    comingSoon: true,
  },
];

const AGENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  DollarSign: ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  PenLine: ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.855z"/></svg>,
  BarChart3: ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16h8"/><path d="M7 11h12"/><path d="M7 6h3"/></svg>,
  Handshake: ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/></svg>,
};

function AgentGridVisual() {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      <AmbientGlow className="w-[500px] h-[500px] -top-16 left-1/2 -translate-x-1/2" />
      <div className="relative grid grid-cols-2 gap-3">
        {AGENTS.map((agent, i) => {
          const IconComp = AGENT_ICONS[agent.icon];
          return (
            <motion.div
              key={agent.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" as any }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: EASE }}
            >
              <div className={`rounded-2xl bg-card/60 backdrop-blur-md border border-border/40 shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-5 h-full space-y-3 ${agent.comingSoon ? "opacity-75" : ""}`}>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <IconComp className="h-4.5 w-4.5" />
                  </div>
                  <span className="font-display text-sm font-bold text-foreground">{agent.title}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{agent.body}</p>
                {agent.comingSoon && (
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-sage bg-sage/10 rounded-full px-2 py-0.5">
                    Coming Soon
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function BentoEmpireVisual() {
  return (
    <div className="relative">
      <AmbientGlow className="w-[380px] h-[380px] -top-10 -right-10" />
      <div className="relative grid grid-cols-5 gap-3 max-w-sm mx-auto">
        {/* Photo */}
        <div className="col-span-2">
          <img
            src="https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400&h=500&fit=crop&crop=center"
            alt="Modern fitness studio"
            className="rounded-2xl object-cover w-full h-full shadow-[0_12px_40px_rgb(0,0,0,0.1)]"
            style={{ minHeight: 240 }}
            loading="lazy" />

        </div>
        {/* Multi-studio card */}
        <GlassCard className="col-span-3 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display font-bold text-foreground text-sm">3 Locations</div>
            <div className="text-[10px] text-muted-foreground">Overview</div>
          </div>
          <div className="space-y-2 mb-3">
            {[
            { name: "Downtown", rev: "$8,420", fill: "94%", w: "w-[94%]", color: "bg-sage" },
            { name: "Uptown", rev: "$6,180", fill: "87%", w: "w-[87%]", color: "bg-primary" },
            { name: "Westside", rev: "$4,320", fill: "72%", w: "w-[72%]", color: "bg-secondary" }].
            map((loc) =>
            <div key={loc.name} className="rounded-lg bg-muted/60 px-2.5 py-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${loc.color}`} />
                    <span className="text-[11px] font-medium text-foreground">{loc.name}</span>
                  </div>
                  <span className="text-[11px] font-bold text-foreground">{loc.rev}</span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${loc.color} ${loc.w}`} />
                </div>
              </div>
            )}
          </div>
          <div className="rounded-lg border border-border px-2.5 py-2 flex items-center justify-between">
            <span className="text-[11px] text-foreground font-medium">Total</span>
            <span className="text-sm font-bold text-foreground">$18,920</span>
          </div>
        </GlassCard>
      </div>
    </div>);

}

/* ─── Hero Mockup ─── */
function HeroMockup() {
  return (
    <div className="relative">
      <AmbientGlow className="w-[500px] h-[500px] -top-16 -right-16" />
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        className="relative">

        <GlassCard className="p-6 max-w-sm mx-auto shadow-[0_20px_60px_rgb(0,0,0,0.1)]">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">K.S</div>
            <div className="font-display font-bold text-foreground">Kinspace.Studio</div>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
            { label: "Revenue", value: "$12.4k" },
            { label: "Bookings", value: "184" },
            { label: "Fill Rate", value: "92%" }].
            map((s) =>
            <div key={s.label} className="rounded-lg bg-muted/60 p-2.5 text-center">
                <div className="text-sm font-bold text-foreground">{s.value}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </div>
            )}
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
        </GlassCard>
      </motion.div>
    </div>);

}

/* ─── Feature Block ─── */
function FeatureBlock({
  eyebrow, title, body, bullets, mockup, reverse







}: {eyebrow?: string;title: string;body?: string;bullets: {icon: React.ReactNode;label: string;text: string;}[];mockup: React.ReactNode;reverse?: boolean;}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={VP}
      variants={stagger}
      className={`flex flex-col ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-12 lg:gap-20`}>

      <motion.div variants={fadeUp} className="flex-1 space-y-5">
        {eyebrow &&
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-sage">{eyebrow}</p>
        }
        <h3 className="font-display text-3xl lg:text-4xl font-bold text-foreground">{title}</h3>
        {body && <p className="text-muted-foreground leading-relaxed">{body}</p>}
        <motion.ul variants={stagger} className="space-y-4 pt-1">
          {bullets.map((b, i) =>
          <motion.li key={i} variants={fadeUp} className="flex items-start gap-3">
              <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage/15 text-sage">
                {b.icon}
              </span>
              <span className="text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">{b.label}</span> {b.text}
              </span>
            </motion.li>
          )}
        </motion.ul>
      </motion.div>
      <motion.div variants={reverse ? fadeLeft : fadeRight} className="flex-1 flex justify-center">
        {mockup}
      </motion.div>
    </motion.div>);

}

/* ─── Compare the Engine ─── */



const COMPARE_COLUMNS = [
  {
    name: "Kinspace.Studio",
    sub: "The Standard",
    featured: true,
    price: "$129/mo",
    priceSub: "Flat rate. All features.",
    items: [
      { icon: "check" as const, text: "100% White-Labeled Ecosystem" },
      { icon: "check" as const, text: "Frictionless SMS Commerce Included" },
      { icon: "check" as const, text: "The Full AI Agent Suite Included" },
      { icon: "check" as const, text: "Flat Pricing. Zero Success Tax." },
    ],
  },
  {
    name: "Mindbody",
    sub: "The Legacy Option",
    featured: false,
    price: "$349+/mo",
    priceSub: "Requires Ultimate tier for similar features.",
    items: [
      { icon: "x" as const, text: "Rents your brand to their marketplace" },
      { icon: "x" as const, text: "Clunky, multi-step app downloads" },
      { icon: "x" as const, text: "Basic automations (No true AI)" },
      { icon: "x" as const, text: "Expensive add-ons for everything" },
    ],
  },
  {
    name: "Momence",
    sub: "The Modern Alternative",
    featured: false,
    price: "$199+/mo",
    priceSub: "Advanced features behind paywalls.",
    items: [
      { icon: "x" as const, text: "High transaction & processing fees" },
      { icon: "x" as const, text: "Confusing feature upsells" },
      { icon: "x" as const, text: "Requires client logins/passwords" },
      { icon: "x" as const, text: "No autonomous Agent Suite" },
    ],
  },
];


function CompareSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative bg-muted/30 overflow-hidden">
      <DotGrid />
      <div className="container relative py-20 lg:py-28 space-y-10">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={stagger}
          className="text-center max-w-2xl mx-auto space-y-4">
          <motion.h2 variants={fadeUp} className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            Software that actually builds your business.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-lg text-muted-foreground leading-relaxed">
            Choose the engine that scales with you. Transparent pricing. Zero success tax.
          </motion.p>
        </motion.div>

        {/* Comparison Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4, duration: 0.6, ease: EASE }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {COMPARE_COLUMNS.map((col, ci) => (
            <motion.div
              key={col.name}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3 + ci * 0.1, duration: 0.5, ease: EASE }}
              className={`rounded-2xl p-6 space-y-5 ${
                col.featured
                  ? "bg-card border-2 border-accent shadow-[0_0_30px_hsl(var(--accent)/0.15)]"
                  : "bg-card/60 border border-border/50"
              }`}>
              <div className="text-center space-y-1">
                {col.featured && (
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sage bg-sage/10 rounded-full px-2.5 py-0.5 mb-2">
                    <Star className="h-3 w-3" /> Recommended
                  </div>
                )}
                <div className={`text-base font-bold ${col.featured ? "text-foreground" : "text-foreground/80"}`}>{col.name}</div>
                <div className="text-xs text-muted-foreground">{col.sub}</div>
                <div className={`text-4xl font-bold mt-3 ${col.featured ? "text-foreground" : "text-foreground/70"}`}>{col.price}</div>
                <div className="text-xs text-muted-foreground">{col.priceSub}</div>
              </div>
              <ul className="space-y-3">
                {col.items.map((item) => (
                  <li key={item.text} className="flex items-start gap-2.5 text-sm text-foreground/90">
                    {item.icon === "check" ? (
                      <Check className="h-4 w-4 mt-0.5 shrink-0 text-sage" />
                    ) : (
                      <X className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
                    )}
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        {/* Pro Engine Nudge */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.7, duration: 0.6, ease: EASE }}
          className="max-w-xl mx-auto">
          <GlassCard className="relative overflow-hidden p-6 sm:p-8 text-center border-accent/40 shadow-[0_12px_40px_hsl(var(--accent)/0.1)]">
            <AmbientGlow className="w-[300px] h-[300px] -top-20 left-1/2 -translate-x-1/2" />
            <div className="relative space-y-3">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sage bg-sage/10 rounded-full px-3 py-1">
                <Sparkles className="h-3.5 w-3.5" /> Pro Engine
              </div>
              <p className="text-foreground leading-relaxed">
                Upgrade to the <span className="font-bold">Pro Engine ($169/mo)</span> to unlock The Agent Suite and SMS Revenue Recovery. Most studios see a full ROI in their first <span className="font-bold">48 hours</span>.
              </p>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Page ─── */
export default function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Nav */}
      {/* Hero with background image */}
      <section className="relative overflow-hidden min-h-[90vh] flex flex-col">
        {/* Background image with overlay */}
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/75 to-background/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>

        {/* Nav — transparent, layered on top */}
        <header className="relative z-50">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/kinspace-logo.png" alt="Kinspace" className="h-8 w-8" />
              <span className="text-xl"><BrandName /></span>
            </div>
            <Button variant="outline" size="sm" className="bg-background/20 backdrop-blur-sm border-foreground/20 hover:bg-background/40" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
        </header>

        {/* Hero content */}
        <div className="container relative flex-1 flex items-center py-16 lg:py-24">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20 w-full">
            <motion.div initial="hidden" animate="visible" variants={stagger} className="flex-1 space-y-6">
              <motion.p variants={fadeLeft} className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">NEXT-GENERATION STUDIO SOFTWARE

              </motion.p>
              <motion.h1 variants={fadeLeft} className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] text-foreground">The frictionless operating system for boutique fitness.

              </motion.h1>
              <motion.p variants={fadeLeft} className="text-lg text-muted-foreground max-w-lg leading-relaxed">Kinspace.Studio works quietly in the background to recover lost revenue, automate your staff, and keep your clients entirely within your own branded ecosystem..

              </motion.p>
              <motion.div variants={fadeLeft}>
                <WaitlistForm />
              </motion.div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              className="flex-1 flex justify-center">

              <HeroMockup />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social Proof Marquee */}
      <Marquee />

      {/* Agitator */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={VP}
        variants={{ hidden: { opacity: 0, scale: 0.96 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.6 } } }}
        className="bg-muted/50">

        <div className="container py-20 lg:py-28 text-center max-w-3xl mx-auto space-y-5">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">Every extra click is costing you revenue.

          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">If your clients have to jump through hoops just to buy a class pack or book a reformer, you are leaving money on the table. It's time to upgrade to frictionless commerce.

          </p>
        </div>
      </motion.section>

      {/* Features */}
      <section className="container py-20 lg:py-28 space-y-28 lg:space-y-36">
        <FeatureBlock
          eyebrow="MAKE MONEY WHILE YOU SLEEP"
          title="Frictionless Commerce."
          body="Don't rely on your clients remembering their passwords. We turn 2 AM cancellations into revenue and empty reformers into flash sales automatically."
          bullets={[
          { icon: <Zap className="h-3.5 w-3.5" />, label: "The Smart Waitlist:", text: "Spot opens up? We text the waitlist and charge the card instantly." },
          { icon: <RefreshCw className="h-3.5 w-3.5" />, label: "1-Tap Refills:", text: 'Clients reply "REFILL" at a red light to buy a 10-pack. Zero logins.' },
          { icon: <Sparkles className="h-3.5 w-3.5" />, label: "Flash Deals:", text: "Monetize dead space by texting drop-in clients 50% off last-minute empty spots." }]
          }
          mockup={<BentoSMSVisual />} />

        {/* Agent Suite Section */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={VP}
          variants={stagger}
          className="space-y-8"
        >
          <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto space-y-4">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-sage">YOUR DIGITAL WORKFORCE</p>
            <h3 className="font-display text-3xl lg:text-4xl font-bold text-foreground">
              Don't just buy software. Hire a team of specialized agents.
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Kinspace.Studio isn't just a calendar. It's powered by four distinct, intelligent agents working in the background to grow your revenue, analyze your data, and run your marketing.
            </p>
          </motion.div>
          <AgentGridVisual />
        </motion.div>

        <FeatureBlock
          eyebrow="BUILT FOR FRANCHISES & AMBITIOUS OWNERS"
          title="Run your Mini-Empire."
          body="Whether you are opening your second studio or your tenth, Kinspace scales flawlessly without the administrative nightmare."
          bullets={[
          { icon: <Globe className="h-3.5 w-3.5" />, label: "One Global Login:", text: "No more logging in and out to manage different locations." },
          { icon: <Users className="h-3.5 w-3.5" />, label: "Unified Client Profiles:", text: "A client buys a pack downtown, they can use it uptown seamlessly." },
          { icon: <Lock className="h-3.5 w-3.5" />, label: "Role-Based Access:", text: "Instant privacy toggles so your front desk only sees what they need to see, while you see the global revenue." }]
          }
          mockup={<BentoEmpireVisual />} />

      </section>

      {/* Compare the Engine */}
      <CompareSection />

      {/* Footer CTA */}

      {/* Footer CTA */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={VP}
        variants={fadeUp}
        className="relative bg-muted/50">

        <DotGrid />
        <div className="container relative py-20 lg:py-28">
          <GlassCard className="mx-auto max-w-2xl p-8 sm:p-12 text-center space-y-5 shadow-[0_20px_60px_rgb(0,0,0,0.06)]">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              Boutique studios deserve boutique software.
            </h2>
            <p className="text-muted-foreground leading-relaxed">We are onboarding a strictly limited cohort of premium studios for our Q2 Beta launch. Secure your spot.

            </p>
            <div className="flex justify-center">
              <WaitlistForm buttonText="Request Beta Access" />
            </div>
          </GlassCard>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-background">
        <div className="container flex items-center justify-center py-8 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} <BrandName /> · All rights reserved.</span>
        </div>
      </footer>
    </div>);

}
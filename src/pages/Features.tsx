import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import {
  CalendarDays, Users, UserCog, DollarSign, MessageSquare, BrainCircuit,
  Building2, Palette, MonitorSmartphone, Globe, CreditCard, Rocket,
  Check, ArrowRight, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DotGrid, AmbientGlow, GlassCard, BrandName, SignupCTA, SiteHeader,
  fadeUp, stagger, EASE, VP,
} from "@/components/landing/shared";

/* ─── Feature Data ─── */

interface Feature {
  label: string;
  built: boolean;
}

interface FeatureCategory {
  icon: React.ReactNode;
  title: string;
  description: string;
  pro?: boolean;
  features: Feature[];
}

const CATEGORIES: FeatureCategory[] = [
  {
    icon: <CalendarDays className="h-5 w-5" />,
    title: "Scheduling & Classes",
    description: "A powerful calendar built for boutique studios.",
    features: [
      { label: "Visual calendar with day/week view", built: true },
      { label: "Class creation with instructor assignment", built: true },
      { label: "Capacity management & fill-rate tracking", built: true },
      { label: "Waitlist with auto-promotion", built: true },
      { label: "Manual booking by staff", built: true },
      { label: "Edit & cancel classes", built: true },
    ],
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Client Management",
    description: "Know your clients inside and out.",
    features: [
      { label: "Student roster with search", built: true },
      { label: "Client profiles & booking history", built: true },
      { label: "Credit & wallet balance tracking", built: true },
      { label: "Package purchases & management", built: true },
    ],
  },
  {
    icon: <UserCog className="h-5 w-5" />,
    title: "Instructor Management",
    description: "Empower your team with the right tools.",
    features: [
      { label: "Instructor roster scoped by organization", built: true },
      { label: "Phone & email contact info", built: true },
      { label: "Direct messaging from admin", built: true },
      { label: "Instructor provisioning (invite via email)", built: true },
      { label: "Instructor portal (separate login)", built: true },
    ],
  },
  {
    icon: <DollarSign className="h-5 w-5" />,
    title: "Finance & Payments",
    description: "Full visibility into your revenue.",
    features: [
      { label: "Revenue dashboard with charts", built: true },
      { label: "Record manual payments", built: true },
      { label: "Payment history & tracking", built: true },
      { label: "Stripe Connect payouts", built: true },
      { label: "Package & credit-based billing", built: true },
    ],
  },
  {
    icon: <MessageSquare className="h-5 w-5" />,
    title: "SMS Commerce",
    description: "Turn texts into transactions — automatically.",
    pro: true,
    features: [
      { label: "Smart Waitlist auto-text", built: true },
      { label: "1-Tap SMS class pack refills", built: true },
      { label: "Flash Deals for empty spots", built: true },
      { label: "Two-way SMS communication", built: true },
      { label: "Communication log", built: true },
    ],
  },
  {
    icon: <BrainCircuit className="h-5 w-5" />,
    title: "AI Agent Suite",
    description: "Your digital workforce that never sleeps.",
    pro: true,
    features: [
      { label: "AI Marketing Hub — auto-draft promo emails", built: true },
      { label: "BI Insights — plain-English analytics queries", built: true },
      { label: "Revenue Agent — automated monetization", built: true },
      { label: "Support Agent — AI concierge", built: false },
    ],
  },
  {
    icon: <Building2 className="h-5 w-5" />,
    title: "Multi-Studio & Organization",
    description: "Scale from one location to many.",
    features: [
      { label: "Multi-location management under one org", built: true },
      { label: "Studio switcher in admin", built: true },
      { label: "Org-level revenue dashboard", built: true },
      { label: "Role-based access (Owner / Front Desk)", built: true },
    ],
  },
  {
    icon: <Palette className="h-5 w-5" />,
    title: "Branding & White-Label",
    description: "Your brand, everywhere your clients look.",
    features: [
      { label: "Custom logo, colors, and theme", built: true },
      { label: "White-labeled booking page per studio", built: true },
      { label: "Dynamic favicon", built: true },
      { label: "Custom studio slug URLs", built: true },
    ],
  },
  {
    icon: <MonitorSmartphone className="h-5 w-5" />,
    title: "Kiosk Mode",
    description: "Transform any tablet into a check-in station.",
    features: [
      { label: "PIN-based kiosk login", built: true },
      { label: "Live class roster display", built: true },
    ],
  },
  {
    icon: <Globe className="h-5 w-5" />,
    title: "Client Booking App",
    description: "A seamless booking experience under your brand.",
    features: [
      { label: "Public booking page per studio", built: true },
      { label: "Student auth gate (login/signup)", built: true },
      { label: "Student dashboard, wallet & profile", built: true },
    ],
  },
  {
    icon: <CreditCard className="h-5 w-5" />,
    title: "Billing & Subscription",
    description: "Transparent SaaS billing built on Stripe.",
    features: [
      { label: "SaaS subscription tiers (Standard / Pro)", built: true },
      { label: "Stripe integration for billing", built: true },
      { label: "Plan comparison & upgrade flow", built: true },
    ],
  },
];

interface RoadmapItem {
  label: string;
  description: string;
}

const ROADMAP: RoadmapItem[] = [
  { label: "AI Support Agent", description: "Automated concierge handling client FAQs, policy questions, and instructor shift-coverage." },
  { label: "Advanced Retention Analytics", description: "Churn prediction, cohort analysis, and automated win-back campaigns." },
  { label: "Mobile App Wrapper", description: "Distribute your branded studio app on the App Store & Google Play." },
  { label: "Marketplace Integrations", description: "Connect with ClassPass, Google Reserve, and other discovery platforms." },
  { label: "Multi-Language Support", description: "Serve clients in their preferred language with localized booking and comms." },
  { label: "Automated Class Reminders", description: "Smart reminders via SMS and email to reduce no-shows." },
];

/* ─── Components ─── */

function FeatureCategoryCard({ category, index }: { category: FeatureCategory; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" as any }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: EASE }}
    >
      <GlassCard className="p-6 h-full space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {category.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base font-bold text-foreground">{category.title}</h3>
              {category.pro && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-sage bg-sage/10 rounded-full px-2 py-0.5">
                  <Sparkles className="h-2.5 w-2.5" /> Pro
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{category.description}</p>
          </div>
        </div>
        <ul className="space-y-2">
          {category.features.map((f) => (
            <li key={f.label} className="flex items-start gap-2 text-sm">
              {f.built ? (
                <Check className="h-4 w-4 mt-0.5 shrink-0 text-sage" />
              ) : (
                <span className="inline-flex items-center justify-center h-4 w-4 mt-0.5 shrink-0 rounded-full bg-accent/20 text-[8px] font-bold text-accent-foreground">
                  ⏳
                </span>
              )}
              <span className={f.built ? "text-foreground" : "text-muted-foreground"}>
                {f.label}
                {!f.built && (
                  <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider text-sage bg-sage/10 rounded-full px-1.5 py-0.5">
                    Soon
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </GlassCard>
    </motion.div>
  );
}

/* ─── Page ─── */

export default function Features() {
  const roadmapRef = useRef<HTMLDivElement>(null);
  const roadmapInView = useInView(roadmapRef, { once: true, margin: "-100px" });

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Nav */}
      <SiteHeader activePath="/features" />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <DotGrid />
        <AmbientGlow className="w-[600px] h-[600px] -top-40 left-1/2 -translate-x-1/2" />
        <div className="container relative py-20 lg:py-32 text-center max-w-3xl mx-auto space-y-6">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="text-xs font-semibold tracking-[0.2em] uppercase text-sage"
          >
            Platform Features
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] text-foreground"
          >
            Everything you need to run a modern studio.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
            className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto"
          >
            From scheduling and payments to AI-powered revenue recovery — Kinspace.Studio is the all-in-one operating system built exclusively for boutique fitness.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
          >
            <SignupCTA />
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container py-16 lg:py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={VP}
          variants={stagger}
          className="text-center mb-12 space-y-3"
        >
          <motion.h2 variants={fadeUp} className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Built & Shipped
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground max-w-xl mx-auto">
            Every feature below is live and ready to use today.
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CATEGORIES.map((cat, i) => (
            <FeatureCategoryCard key={cat.title} category={cat} index={i} />
          ))}
        </div>
      </section>

      {/* Roadmap */}
      <section ref={roadmapRef} className="relative bg-muted/30 overflow-hidden">
        <DotGrid />
        <div className="container relative py-20 lg:py-28 space-y-10">
          <motion.div
            initial="hidden"
            animate={roadmapInView ? "visible" : "hidden"}
            variants={stagger}
            className="text-center max-w-2xl mx-auto space-y-4"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sage bg-sage/10 rounded-full px-3 py-1">
              <Rocket className="h-3.5 w-3.5" /> Coming Soon
            </motion.div>
            <motion.h2 variants={fadeUp} className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              On the Roadmap
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground leading-relaxed">
              We're constantly shipping. Here's what's coming next.
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={roadmapInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4, duration: 0.6, ease: EASE }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto"
          >
            {ROADMAP.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 16 }}
                animate={roadmapInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.5 + i * 0.08, duration: 0.5, ease: EASE }}
              >
                <GlassCard className="p-5 h-full space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-sage animate-pulse" />
                    <h4 className="font-display text-sm font-bold text-foreground">{item.label}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer CTA */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={VP}
        variants={fadeUp}
        className="relative"
      >
        <div className="container py-20 lg:py-28">
          <GlassCard className="mx-auto max-w-2xl p-8 sm:p-12 text-center space-y-5 shadow-[0_20px_60px_rgb(0,0,0,0.06)]">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              Ready to modernize your studio?
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Join studios that are growing faster with less effort. No credit card required.
            </p>
            <div className="flex justify-center">
              <SignupCTA buttonText="Create Your Studio" align="center" />
            </div>
          </GlassCard>
        </div>
      </motion.section>

      <SiteFooter />
    </div>
  );
}

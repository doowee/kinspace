import { Helmet } from "react-helmet-alternative";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Check, X, Minus, DollarSign, Eye, MessageSquare, Brain, ArrowRight } from "lucide-react";
import { SiteHeader, GlassCard, DotGrid, AmbientGlow, SignupCTA, fadeUp, stagger, VP } from "@/components/landing/shared";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

/* ─── Pain-point cards ─── */
const PAIN_POINTS = [
  {
    icon: DollarSign,
    title: "Hidden & Escalating Fees",
    body: "Mindbody charges per-booking transaction fees on top of monthly plans. WellnessLiving stacks add-on costs that balloon your bill as you grow. Kinspace is flat-rate — $99 or $169, no surprises.",
  },
  {
    icon: Eye,
    title: '"Call for Pricing" Games',
    body: "Momence and Glofox won't publish prices — you sit through a sales call to learn what you'll pay. Kinspace publishes every plan, every feature, on our pricing page. No gatekeeping.",
  },
  {
    icon: MessageSquare,
    title: "No Native SMS Commerce",
    body: "None of the legacy platforms offer 1-tap SMS flash drops or AI-powered credit refill prompts. They bolt on generic email marketing; Kinspace gives you a revenue channel in your clients' text inbox.",
  },
  {
    icon: Brain,
    title: "AI Bolted On, Not Built In",
    body: "Competitors sell 'AI features' as expensive add-ons or separate products. Kinspace Pro includes an AI Revenue Agent, SmartCover™ sub requests, and business intelligence — all out of the box.",
  },
];

/* ─── Comparison data ─── */
type CellValue = "yes" | "no" | "partial" | string;

interface CompRow {
  feature: string;
  kinspace: CellValue;
  mindbody: CellValue;
  momence: CellValue;
  wellnessliving: CellValue;
}

const COMPARISON: CompRow[] = [
  { feature: "Starting price", kinspace: "$99/mo", mindbody: "$99/mo*", momence: '"Custom"', wellnessliving: "$69/mo" },
  { feature: "Transparent public pricing", kinspace: "yes", mindbody: "no", momence: "no", wellnessliving: "partial" },
  { feature: "Per-booking transaction fees", kinspace: "None", mindbody: "Yes", momence: "Yes", wellnessliving: "Yes" },
  { feature: "White-label booking page", kinspace: "yes", mindbody: "Widget only", momence: "yes", wellnessliving: "yes" },
  { feature: "1-Tap SMS Flash Drops", kinspace: "yes", mindbody: "no", momence: "no", wellnessliving: "no" },
  { feature: "AI Revenue Agent", kinspace: "yes", mindbody: "no", momence: "no", wellnessliving: "no" },
  { feature: "SmartCover™ sub requests", kinspace: "yes", mindbody: "no", momence: "no", wellnessliving: "no" },
  { feature: "Multi-location support", kinspace: "Included", mindbody: "Premium tier", momence: "Add-on", wellnessliving: "Premium tier" },
  { feature: "Stripe direct payouts", kinspace: "yes", mindbody: "no", momence: "yes", wellnessliving: "no" },
  { feature: "Branded client wallet", kinspace: "yes", mindbody: "no", momence: "no", wellnessliving: "no" },
  { feature: "Setup time", kinspace: "Same day", mindbody: "Weeks", momence: "Days", wellnessliving: "Days" },
  { feature: "Contract required", kinspace: "No", mindbody: "Yes (annual)", momence: "No", wellnessliving: "Varies" },
];

const COMPETITORS = [
  { key: "kinspace" as const, label: "Kinspace" },
  { key: "mindbody" as const, label: "Mindbody" },
  { key: "momence" as const, label: "Momence" },
  { key: "wellnessliving" as const, label: "WellnessLiving" },
];

function CellIcon({ value }: { value: CellValue }) {
  if (value === "yes") return <Check className="h-5 w-5 text-primary mx-auto" />;
  if (value === "no") return <X className="h-5 w-5 text-destructive/60 mx-auto" />;
  if (value === "partial") return <Minus className="h-5 w-5 text-muted-foreground mx-auto" />;
  return <span className="text-sm">{value}</span>;
}

/* ─── FAQ ─── */
const FAQ = [
  {
    q: "How do I migrate from Mindbody to Kinspace?",
    a: "We offer a white-glove migration service. Export your client list, schedule, and package data from Mindbody as a CSV — our team imports everything into Kinspace within 24 hours. No downtime, no lost data.",
  },
  {
    q: "Does Kinspace charge per-booking or transaction fees?",
    a: "No. Both Standard ($99/mo) and Pro Engine ($169/mo) are flat-rate. The only external fee is Stripe's standard processing rate (2.9% + 30¢) which goes directly to Stripe, not to us.",
  },
  {
    q: "Can I keep my custom domain and branding?",
    a: "Absolutely. Every Kinspace studio gets a white-label booking page at yourname.kinspace.studio, and Pro studios can connect a custom domain. Your logo, colors, and brand identity carry through the entire client experience.",
  },
  {
    q: "How long does setup take compared to Mindbody or Momence?",
    a: "Most studios are live the same day they sign up. Create your studio, add your class schedule, customize your branding, and share your booking link — that's it. No onboarding calls required (though we're happy to help).",
  },
  {
    q: "What happens to my existing client data?",
    a: "Your client list, contact info, and booking history can be imported via CSV. We never lock you in — you can export your Kinspace data at any time, something not every competitor makes easy.",
  },
  {
    q: "Is there a contract or cancellation fee?",
    a: "No contracts, no cancellation fees, no annual lock-ins. You're billed monthly and can cancel anytime from your dashboard. We keep studios because the product works, not because of fine print.",
  },
  {
    q: "How does Kinspace compare to Momence for yoga and Pilates studios?",
    a: "Momence is a solid platform, but it hides pricing behind sales calls and charges processing fees. Kinspace was purpose-built for boutique movement studios — yoga, Pilates, barre, dance — with features like SMS flash drops, AI-powered revenue recovery, and a branded client wallet that Momence doesn't offer.",
  },
];

export default function Switch() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader activePath="/switch" />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <DotGrid />
        <AmbientGlow className="w-[600px] h-[600px] -top-40 -right-40" />

        <motion.div
          className="container relative z-10 max-w-3xl"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.1]">
            Switch to <span className="text-primary">Kinspace.Studio</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Tired of hidden fees, opaque pricing, and software that wasn't built for boutique studios?
            Studios are switching from <strong className="text-foreground">Mindbody</strong>, <strong className="text-foreground">Momence</strong>, <strong className="text-foreground">WellnessLiving</strong>, and <strong className="text-foreground">Glofox</strong> to a platform that's transparent, modern, and AI-native.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8">
            <SignupCTA buttonText="Start Your Free Trial" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Pain-point cards ── */}
      <section className="py-20 md:py-28">
        <div className="container">
          <motion.h2
            className="text-3xl md:text-4xl font-display font-bold text-center mb-4"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={VP}
          >
            Why Studios Switch
          </motion.h2>
          <motion.p
            className="text-muted-foreground text-center max-w-xl mx-auto mb-14"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={VP}
          >
            Real frustrations we hear every week from studio owners leaving legacy platforms.
          </motion.p>

          <motion.div
            className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={VP}
          >
            {PAIN_POINTS.map((p) => (
              <motion.div key={p.title} variants={fadeUp}>
                <GlassCard className="p-6 h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <p.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">{p.title}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">{p.body}</p>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Comparison table ── */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container">
          <motion.h2
            className="text-3xl md:text-4xl font-display font-bold text-center mb-4"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={VP}
          >
            Head-to-Head Comparison
          </motion.h2>
          <motion.p
            className="text-muted-foreground text-center max-w-xl mx-auto mb-12"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={VP}
          >
            See how Kinspace stacks up against Mindbody, Momence, and WellnessLiving on the features that matter.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={VP}
            className="max-w-5xl mx-auto"
          >
            <GlassCard className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40">
                      <TableHead className="min-w-[180px] text-foreground font-semibold">Feature</TableHead>
                      {COMPETITORS.map((c) => (
                        <TableHead
                          key={c.key}
                          className={`text-center min-w-[120px] font-semibold ${
                            c.key === "kinspace"
                              ? "text-primary bg-primary/5"
                              : "text-foreground"
                          }`}
                        >
                          {c.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {COMPARISON.map((row) => (
                      <TableRow key={row.feature} className="border-border/30">
                        <TableCell className="font-medium text-foreground">{row.feature}</TableCell>
                        {COMPETITORS.map((c) => (
                          <TableCell
                            key={c.key}
                            className={`text-center ${c.key === "kinspace" ? "bg-primary/5" : ""}`}
                          >
                            <CellIcon value={row[c.key]} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="px-6 py-3 text-xs text-muted-foreground border-t border-border/30">
                * Mindbody's $99/mo "Starter" plan has limited features; most studios need the $199+ "Accelerate" or "Ultimate" tiers. Competitor data sourced from public pricing pages and review sites as of 2025.
              </p>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 md:py-28">
        <div className="container max-w-3xl">
          <motion.h2
            className="text-3xl md:text-4xl font-display font-bold text-center mb-4"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={VP}
          >
            Switching FAQ
          </motion.h2>
          <motion.p
            className="text-muted-foreground text-center max-w-xl mx-auto mb-12"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={VP}
          >
            Answers to the questions studio owners ask before making the move.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={VP}
          >
            <Accordion type="multiple" className="space-y-3">
              {FAQ.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="border rounded-xl px-5 bg-card/60 backdrop-blur-sm border-border/40"
                >
                  <AccordionTrigger className="text-left text-base font-medium hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <AmbientGlow className="w-[500px] h-[500px] -bottom-40 left-1/2 -translate-x-1/2" />
        <div className="container relative z-10 text-center">
          <motion.h2
            className="text-3xl md:text-4xl font-display font-bold mb-4"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={VP}
          >
            Ready to make the switch?
          </motion.h2>
          <motion.p
            className="text-muted-foreground mb-8 max-w-lg mx-auto"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={VP}
          >
            Join hundreds of studios that left legacy platforms behind. No contracts, no hidden fees, live in a day.
          </motion.p>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={VP}
            className="flex justify-center"
          >
            <SignupCTA align="center" buttonText="Start Your Free Trial" />
          </motion.div>
        </div>
      </section>
    </div>
  );
}

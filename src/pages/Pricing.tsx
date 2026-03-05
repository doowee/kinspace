import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Zap, Sparkles, ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SiteHeader,
  SignupCTA,
  GlassCard,
  DotGrid,
  AmbientGlow,
  fadeUp,
  stagger,
  VP,
  BrandName,
} from "@/components/landing/shared";

const PLANS = [
  {
    tier: "standard",
    name: "Standard",
    price: "$99",
    subtitle: "Everything you need to run a modern studio",
    features: [
      "Unlimited classes & bookings",
      "Multi-location management",
      "Stripe payments & invoicing",
      "Branded client portal & wallet",
      "Analytics dashboard",
      "Email & SMS reminders",
      "Instructor scheduling",
      "Custom packages & pricing",
    ],
    cta: "Start Your Free Trial",
    ctaLink: "/auth",
    ctaVariant: "outline" as const,
    icon: Zap,
  },
  {
    tier: "pro",
    name: "Pro Engine",
    price: "$169",
    subtitle: "AI-powered growth tools for ambitious studios",
    badge: "Recommended",
    features: [
      "Everything in Standard",
      "AI Revenue Agent",
      "1-Tap SMS Flash Drops",
      "Smart Review automation",
      "Advanced BI insights",
      "SmartCover™ sub requests",
      "Priority support",
      "Early access to new features",
    ],
    cta: "Book a Demo",
    ctaLink: "mailto:hello@kinspace.studio?subject=Pro%20Engine%20Demo%20Request",
    ctaVariant: "default" as const,
    icon: Sparkles,
  },
];

const COMPARISON = [
  { feature: "Unlimited classes & bookings", standard: true, pro: true },
  { feature: "Multi-location management", standard: true, pro: true },
  { feature: "Stripe payments & invoicing", standard: true, pro: true },
  { feature: "Branded client portal", standard: true, pro: true },
  { feature: "Analytics dashboard", standard: true, pro: true },
  { feature: "Instructor scheduling", standard: true, pro: true },
  { feature: "Email & SMS reminders", standard: true, pro: true },
  { feature: "Custom packages & pricing", standard: true, pro: true },
  { feature: "AI Revenue Agent", standard: false, pro: true },
  { feature: "1-Tap SMS Flash Drops", standard: false, pro: true },
  { feature: "Smart Review automation", standard: false, pro: true },
  { feature: "Advanced BI insights", standard: false, pro: true },
  { feature: "SmartCover™ sub requests", standard: false, pro: true },
  { feature: "Priority support", standard: false, pro: true },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader activePath="/pricing" />

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <DotGrid />
        <AmbientGlow className="w-[600px] h-[600px] -top-40 left-1/2 -translate-x-1/2" />

        <div className="container relative z-10 max-w-3xl text-center mx-auto">
          <motion.div variants={stagger} initial="hidden" animate="visible">
            <motion.p variants={fadeUp} className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-4">
              Pricing
            </motion.p>
            <motion.h1 variants={fadeUp} className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Simple, transparent pricing
            </motion.h1>
            <motion.p variants={fadeUp} className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto">
              One price per location, per month. No hidden fees, no per-student charges, no contracts.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ─── Plan Cards ─── */}
      <section className="relative pb-24">
        <div className="container max-w-5xl mx-auto">
          <motion.div
            className="grid gap-8 md:grid-cols-2"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={VP}
          >
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              return (
                <motion.div key={plan.tier} variants={fadeUp}>
                  <GlassCard
                    className={`relative p-8 md:p-10 h-full flex flex-col ${
                      plan.badge ? "ring-2 ring-primary/20 border-primary/30" : ""
                    }`}
                  >
                    {plan.badge && (
                      <Badge className="absolute -top-3 left-8 bg-primary text-primary-foreground px-3 py-1 text-xs">
                        {plan.badge}
                      </Badge>
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <span className="font-display text-lg font-bold">{plan.name}</span>
                    </div>

                    <div className="mb-1">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">/mo per location</span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-6">{plan.subtitle}</p>

                    <ul className="space-y-2.5 mb-8 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      size="lg"
                      variant={plan.ctaVariant}
                      className="w-full gap-2"
                      asChild
                    >
                      {plan.ctaLink.startsWith("mailto:") ? (
                        <a href={plan.ctaLink}>
                          {plan.tier === "pro" && <Mail className="h-4 w-4" />}
                          {plan.cta}
                        </a>
                      ) : (
                        <Link to={plan.ctaLink}>
                          {plan.cta} <ArrowRight className="h-4 w-4" />
                        </Link>
                      )}
                    </Button>
                  </GlassCard>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ─── Feature Comparison Table ─── */}
      <section className="relative py-24 border-t border-border/40">
        <div className="container max-w-3xl mx-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={VP}
          >
            <motion.h2 variants={fadeUp} className="font-display text-3xl font-bold text-center mb-12">
              Feature comparison
            </motion.h2>

            <motion.div variants={fadeUp} className="overflow-hidden rounded-2xl border border-border/40">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_80px_80px] md:grid-cols-[1fr_120px_120px] bg-muted/50 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Feature</span>
                <span className="text-center">Standard</span>
                <span className="text-center">Pro</span>
              </div>

              {/* Table rows */}
              {COMPARISON.map((row, i) => (
                <div
                  key={row.feature}
                  className={`grid grid-cols-[1fr_80px_80px] md:grid-cols-[1fr_120px_120px] px-6 py-3.5 text-sm ${
                    i % 2 === 0 ? "bg-card/50" : "bg-background"
                  } ${i !== COMPARISON.length - 1 ? "border-b border-border/20" : ""}`}
                >
                  <span className="text-foreground">{row.feature}</span>
                  <span className="flex justify-center">
                    {row.standard ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <span className="h-4 w-4 block rounded-full border border-border/40" />
                    )}
                  </span>
                  <span className="flex justify-center">
                    {row.pro ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <span className="h-4 w-4 block rounded-full border border-border/40" />
                    )}
                  </span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── Bottom CTA ─── */}
      <section className="relative py-24 border-t border-border/40">
        <AmbientGlow className="w-[500px] h-[500px] bottom-0 left-1/2 -translate-x-1/2" />
        <div className="container relative z-10 max-w-2xl mx-auto text-center">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={VP}
          >
            <motion.h2 variants={fadeUp} className="font-display text-3xl md:text-4xl font-bold mb-4">
              Ready to grow your studio?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground mb-8">
              Start your 14-day free trial. No credit card required.
            </motion.p>
            <motion.div variants={fadeUp}>
              <SignupCTA align="center" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Variants, Easing } from "framer-motion";

/* ─── Animation Presets ─── */
export const EASE: Easing = [0.25, 0.1, 0.25, 1];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};
export const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE } },
};
export const fadeRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE } },
};
export const stagger: Variants = {
  visible: { transition: { staggerChildren: 0.12 } },
};
export const VP = { once: true, margin: "-100px" as any };

/* ─── Shared UI ─── */

export function DotGrid() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.35]"
      style={{
        backgroundImage: "radial-gradient(hsl(var(--foreground) / 0.15) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    />
  );
}

export function AmbientGlow({ className = "" }: { className?: string }) {
  return (
    <div
      className={`absolute rounded-full blur-[120px] pointer-events-none ${className}`}
      style={{
        background:
          "radial-gradient(circle, hsl(var(--sage) / 0.2) 0%, hsl(var(--terracotta) / 0.12) 50%, transparent 80%)",
      }}
    />
  );
}

export function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl bg-card/80 backdrop-blur-md border border-card/20 shadow-[0_8px_30px_rgb(0,0,0,0.08)] ${className}`}
    >
      {children}
    </div>
  );
}

export function BrandName() {
  return (
    <span className="font-display">
      <span className="font-bold">Kinspace</span>
      <span className="font-normal opacity-70">.Studio</span>
    </span>
  );
}

export function SignupCTA({ buttonText = "Get Started Free" }: { buttonText?: string }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
      <Button size="lg" className="h-12 px-8 whitespace-nowrap gap-2" asChild>
        <Link to="/auth">
          {buttonText} <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
      <Button variant="outline" size="lg" className="h-12 px-6 whitespace-nowrap" asChild>
        <Link to="/auth">Sign In</Link>
      </Button>
    </div>
  );
}

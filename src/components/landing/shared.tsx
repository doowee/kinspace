import { Link } from "react-router-dom";
import { ArrowRight, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import type { Variants, Easing } from "framer-motion";

/* ─── Animation Presets ─── */
export const EASE: Easing = [0.25, 0.1, 0.25, 1];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } }
};
export const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE } }
};
export const fadeRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE } }
};
export const stagger: Variants = {
  visible: { transition: { staggerChildren: 0.12 } }
};
export const VP = { once: true, margin: "-100px" as any };

/* ─── Shared UI ─── */

export function DotGrid() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.35]"
      style={{
        backgroundImage: "radial-gradient(hsl(var(--foreground) / 0.15) 1px, transparent 1px)",
        backgroundSize: "24px 24px"
      }} />);


}

export function AmbientGlow({ className = "" }: {className?: string;}) {
  return (
    <div
      className={`absolute rounded-full blur-[120px] pointer-events-none ${className}`}
      style={{
        background:
        "radial-gradient(circle, hsl(var(--sage) / 0.2) 0%, hsl(var(--terracotta) / 0.12) 50%, transparent 80%)"
      }} />);


}

export function GlassCard({ children, className = "" }: {children: React.ReactNode;className?: string;}) {
  return (
    <div
      className={`rounded-2xl bg-card/80 backdrop-blur-md border border-card/20 shadow-[0_8px_30px_rgb(0,0,0,0.08)] ${className}`}>
      
      {children}
    </div>);

}

export function BrandName() {
  return (
    <span className="font-display">
      <span className="font-bold">Kinspace</span>
      <span className="font-normal opacity-70">.Studio</span>
    </span>);

}

export function SignupCTA({ buttonText = "Start Your Free Trial", align = "left" }: {buttonText?: string; align?: "left" | "center";}) {
  return (
    <div className={`w-full flex ${align === "center" ? "justify-center" : "justify-start"}`}>
      <Button size="lg" className="h-12 px-8 whitespace-nowrap gap-2" asChild>
        <Link to="/auth">
          {buttonText} <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>);

}

/* ─── Site Header ─── */

const NAV_LINKS = [
{ to: "/features", label: "Features" },
{ to: "/pricing", label: "Pricing" },
{ to: "/auth", label: "Switch to Kinspace" },
{ href: "#", label: "Support" }] as
const;

export function SiteHeader({ activePath = "/" }: {activePath?: string;}) {
  const linkClass = (path: string) =>
  path === activePath ?
  "text-foreground font-semibold transition-colors" :
  "text-foreground/70 hover:text-foreground transition-colors";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        {/* Left: Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src="/kinspace-logo.png" alt="Kinspace" className="h-8 w-8" />
          <span className="text-xl"><BrandName /></span>
        </Link>

        {/* Center: nav links (desktop) */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          {NAV_LINKS.map((link) =>
          "to" in link && link.to ?
          <Link key={link.label} to={link.to} className={linkClass(link.to)}>
                {link.label}
              </Link> :

          <a key={link.label} href={(link as any).href ?? "#"} className="text-foreground/70 hover:text-foreground transition-colors">
                {link.label}
              </a>

          )}
        </nav>

        {/* Right: auth actions (desktop) */}
        <div className="hidden md:flex items-center gap-5">
          <Link to="/auth" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
            Log in
          </Link>
          <Button variant="outline" size="sm" className="rounded-full border-foreground/20 hover:bg-foreground/5" asChild>
            <Link to="/auth">Start free trial</Link>
          </Button>
        </div>

        {/* Mobile hamburger */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="text-foreground/70">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <nav className="flex flex-col gap-4 mt-8 text-sm font-medium">
              {NAV_LINKS.map((link) =>
              "to" in link && link.to ?
              <Link key={link.label} to={link.to} className="py-2 hover:text-primary transition-colors">
                    {link.label}
                  </Link> :

              <a key={link.label} href={(link as any).href ?? "#"} className="py-2 hover:text-primary transition-colors">
                    {link.label}
                  </a>

              )}
              <hr className="border-border my-2" />
              <Link to="/auth" className="py-2 hover:text-primary transition-colors">Log in</Link>
              <Button variant="outline" size="sm" className="rounded-full mt-2" asChild>
                <Link to="/auth">Start free trial</Link>
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>);

}
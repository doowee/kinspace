import { SiteFooter } from "@/components/landing/SiteFooter";
import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl py-16 lg:py-24 space-y-8">
        <div className="space-y-3">
          <Link to="/" className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
          <h1 className="font-display text-4xl lg:text-5xl font-bold text-foreground">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: May 2026</p>
        </div>

        <section className="prose prose-neutral max-w-none space-y-6 text-foreground/80 leading-relaxed">
          <p>
            Welcome to Kinspace Studio. These Terms of Service ("Terms") govern your use of the Kinspace Studio
            platform (the "Service"). By creating an account or using the Service you agree to these Terms.
          </p>

          <h2 className="font-display text-2xl font-semibold text-foreground">1. The Service</h2>
          <p>
            Kinspace Studio provides studio management tools including scheduling, payments, SMS messaging, and
            related operational features for boutique wellness studios.
          </p>

          <h2 className="font-display text-2xl font-semibold text-foreground">2. Your account</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account and for all activity that
            occurs under it. Notify us immediately of any unauthorized use.
          </p>

          <h2 className="font-display text-2xl font-semibold text-foreground">3. Acceptable use</h2>
          <p>
            You agree not to misuse the Service, including by sending unsolicited SMS messages, attempting to
            access data you do not own, or interfering with normal operation of the platform.
          </p>

          <h2 className="font-display text-2xl font-semibold text-foreground">4. Demo environment</h2>
          <p>
            Some Kinspace deployments operate in a demo environment using test payment processors and test
            messaging numbers. No real charges are processed in demo mode.
          </p>

          <h2 className="font-display text-2xl font-semibold text-foreground">5. Contact</h2>
          <p>
            Questions about these Terms? Email us at{" "}
            <a href="mailto:hello@kinspace.studio" className="underline">hello@kinspace.studio</a>.
          </p>
        </section>
      </div>
      <SiteFooter />
    </div>
  );
}

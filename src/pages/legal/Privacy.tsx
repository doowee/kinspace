import { SiteFooter } from "@/components/landing/SiteFooter";
import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl py-16 lg:py-24 space-y-8">
        <div className="space-y-3">
          <Link to="/" className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
          <h1 className="font-display text-4xl lg:text-5xl font-bold text-foreground">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: May 2026</p>
        </div>

        <section className="prose prose-neutral max-w-none space-y-6 text-foreground/80 leading-relaxed">
          <p>
            Kinspace Studio ("we", "us") respects your privacy. This policy explains what we collect, how we
            use it, and the choices you have.
          </p>

          <h2 className="font-display text-2xl font-semibold text-foreground">1. Information we collect</h2>
          <p>
            Account details (name, email, phone), studio operational data (classes, bookings, transactions),
            and usage logs needed to operate and secure the platform.
          </p>

          <h2 className="font-display text-2xl font-semibold text-foreground">2. SMS messaging</h2>
          <p>
            If your studio uses SMS features, we send messages on its behalf to recipients who have opted in.
            Recipients can reply STOP at any time to opt out, and we will not contact them again unless they
            text START.
          </p>

          <h2 className="font-display text-2xl font-semibold text-foreground">3. Payment data</h2>
          <p>
            Payments are processed by Stripe. We never store full card numbers on our servers.
          </p>

          <h2 className="font-display text-2xl font-semibold text-foreground">4. Data sharing</h2>
          <p>
            We do not sell personal data. We share data only with service providers required to operate the
            platform (e.g., hosting, payments, SMS delivery), and as required by law.
          </p>

          <h2 className="font-display text-2xl font-semibold text-foreground">5. Your rights</h2>
          <p>
            You may request a copy of your data or its deletion at any time by emailing{" "}
            <a href="mailto:privacy@kinspace.studio" className="underline">privacy@kinspace.studio</a>.
          </p>
        </section>
      </div>
      <SiteFooter />
    </div>
  );
}

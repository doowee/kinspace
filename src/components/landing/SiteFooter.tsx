import { Link } from "react-router-dom";
import { BrandName } from "@/components/landing/shared";

const PRODUCT_LINKS = [
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/switch", label: "Switch to Kinspace" },
  { to: "/auth", label: "Log In" },
];

const COMPANY_LINKS: { to?: string; href?: string; label: string }[] = [
  { href: "mailto:hello@kinspace.studio", label: "Support" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms of Service" },
];

export function SiteFooter() {
  return (
    <footer className="bg-foreground text-background" role="contentinfo">
      <div className="container py-16">
        <nav aria-label="Footer" className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <img src="/kinspace-logo.png" alt="Kinspace" className="h-7 w-7 brightness-0 invert" />
              <span className="text-lg"><BrandName /></span>
            </div>
            <p className="text-sm text-background/60 leading-relaxed max-w-xs">
              Studio management software for boutique fitness — scheduling, payments, SMS commerce, and AI-powered revenue tools in one platform.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-background/40 mb-4">Product</h3>
            <ul className="space-y-2.5">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm text-background/60 hover:text-background transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-background/40 mb-4">Company</h3>
            <ul className="space-y-2.5">
              {COMPANY_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-background/60 hover:text-background transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Bottom bar */}
        <div className="border-t border-background/10 mt-12 pt-8 text-center">
          <p className="text-xs text-background/40">
            © {new Date().getFullYear()} Kinspace Studio. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

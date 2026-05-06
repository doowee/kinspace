import { useAuth } from "@/contexts/AuthContext";
import { useStudio } from "@/contexts/StudioContext";
import { DemoPhoneProvider } from "@/contexts/DemoPhoneContext";
import StudioSwitcher from "./StudioSwitcher";

import DynamicLogo from "./DynamicLogo";
import { DemoModeBadge } from "./DemoModeBadge";
import DemoPhone from "./demo/DemoPhone";
import DemoTriggers from "./demo/DemoTriggers";
import { useDynamicFavicon } from "@/hooks/use-dynamic-favicon";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import { LogOut, LayoutDashboard, CalendarDays, Building2, Wallet, Settings, ExternalLink, Ticket, Users, ShieldCheck, Copy, Check, CreditCard, GraduationCap, UserCircle, Briefcase } from "lucide-react";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Outlet, Navigate } from "react-router-dom";
import { createContext, useContext, useState, useCallback } from "react";

export type ViewAsRole = "owner" | "front-desk";
const ViewAsContext = createContext<ViewAsRole>("owner");
export const useViewAsRole = () => useContext(ViewAsContext);
import { NavLink } from "./NavLink";

const PUBLISHED_DOMAIN = "https://kinspace.studio";

function CopyBookingLinkItem({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    const url = `${PUBLISHED_DOMAIN}/book/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [slug]);

  return (
    <DropdownMenuItem onClick={handleCopy}>
      {copied ? <Check className="h-4 w-4 mr-2 text-primary" /> : <Copy className="h-4 w-4 mr-2" />}
      {copied ? "Link Copied!" : "Copy Booking Link"}
    </DropdownMenuItem>
  );
}

function CopyKioskLinkItem() {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    const url = `${PUBLISHED_DOMAIN}/kiosk-login`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  return (
    <DropdownMenuItem onClick={handleCopy}>
      {copied ? <Check className="h-4 w-4 mr-2 text-primary" /> : <Ticket className="h-4 w-4 mr-2" />}
      {copied ? "Link Copied!" : "Copy Kiosk Link"}
    </DropdownMenuItem>
  );
}

function CopyStudentPortalLinkItem({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    const url = `${PUBLISHED_DOMAIN}/s/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [slug]);

  return (
    <DropdownMenuItem onClick={handleCopy}>
      {copied ? <Check className="h-4 w-4 mr-2 text-primary" /> : <UserCircle className="h-4 w-4 mr-2" />}
      {copied ? "Link Copied!" : "Copy Student Portal Link"}
    </DropdownMenuItem>
  );
}

function CopyStaffPortalLinkItem({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    const url = `${PUBLISHED_DOMAIN}/s/${slug}/staff`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [slug]);

  return (
    <DropdownMenuItem onClick={handleCopy}>
      {copied ? <Check className="h-4 w-4 mr-2 text-primary" /> : <Briefcase className="h-4 w-4 mr-2" />}
      {copied ? "Link Copied!" : "Copy Staff Portal Link"}
    </DropdownMenuItem>
  );
}

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const { memberships, loading, activeStudio, activeRole } = useStudio();
  const [viewAsRole, setViewAsRole] = useState<ViewAsRole>("owner");

  const studioLogoUrl = (activeStudio as any)?.logo_url ?? null;
  useDynamicFavicon(studioLogoUrl);

  if (!user) return <Navigate to="/auth" replace />;
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>);
  }

  const initials = user.email?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <DemoPhoneProvider>
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container flex h-14 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <DynamicLogo logoUrl={studioLogoUrl} studioName={activeStudio?.name} size={32} />
                <DemoModeBadge />
              </div>
              <div className="h-5 w-px bg-border" />
              <StudioSwitcher />
              <div className="h-5 w-px bg-border" />
              <nav className="flex items-center gap-1">
                <NavLink
                  to="/admin"
                  end
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  activeClassName="bg-accent text-accent-foreground font-medium"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </NavLink>
                {activeRole === "student" && activeStudio && (
                  <a
                    href={`/book/${activeStudio.slug}`}
                    className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Book a Class
                  </a>
                )}
                {activeRole !== "student" && (
                  <>
                     <NavLink
                      to="/schedule"
                      className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <CalendarDays className="h-4 w-4" />
                      Schedule
                    </NavLink>
                    <NavLink
                      to="/students"
                      className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <Users className="h-4 w-4" />
                      Students
                    </NavLink>
                    <NavLink
                      to="/instructors"
                      className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <GraduationCap className="h-4 w-4" />
                      Instructors
                    </NavLink>
                    <NavLink
                      to="/finance"
                      className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <Wallet className="h-4 w-4" />
                      Finance
                    </NavLink>
                  </>
                )}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <DemoTriggers />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
                    {user.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {activeRole !== "student" && (
                    <>
                      <div className="px-2 py-1.5">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">View As</p>
                        <div className="flex gap-1">
                          <Button
                            variant={viewAsRole === "owner" ? "default" : "outline"}
                            size="sm"
                            className="flex-1 text-xs h-7"
                            onClick={() => setViewAsRole("owner")}
                          >
                            👑 Owner
                          </Button>
                          <Button
                            variant={viewAsRole === "front-desk" ? "default" : "outline"}
                            size="sm"
                            className="flex-1 text-xs h-7"
                            onClick={() => setViewAsRole("front-desk")}
                          >
                            👋 Front Desk
                          </Button>
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <a href="/org-admin" className="flex items-center gap-2 cursor-pointer">
                          <Building2 className="h-4 w-4" />
                          Organization
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href="/settings" className="flex items-center gap-2 cursor-pointer">
                          <Settings className="h-4 w-4" />
                          Settings
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href="/admin/billing" className="flex items-center gap-2 cursor-pointer">
                          <CreditCard className="h-4 w-4" />
                          Billing & Payouts
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {activeStudio?.slug && (
                        <>
                          <DropdownMenuItem onClick={() => window.open(`/book/${activeStudio.slug}`, '_blank')}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Client App
                          </DropdownMenuItem>
                          <CopyBookingLinkItem slug={activeStudio.slug} />
                          <CopyStudentPortalLinkItem slug={activeStudio.slug} />
                          <CopyStaffPortalLinkItem slug={activeStudio.slug} />
                          <CopyKioskLinkItem />
                        </>
                      )}
                    </>
                  )}
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <main className="container py-8">
          <ViewAsContext.Provider value={viewAsRole}>
            <Outlet />
          </ViewAsContext.Provider>
        </main>
        <DemoPhone />
      </div>
    </DemoPhoneProvider>
  );
}
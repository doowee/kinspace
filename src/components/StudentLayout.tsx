import { Outlet, NavLink, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Home, CalendarDays, Ticket, User, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

function useStudentNavItems() {
  const { studio_slug } = useParams<{ studio_slug?: string }>();
  const prefix = studio_slug ? `/s/${studio_slug}` : "";

  return useMemo(() => {
    const nav = [
      { to: `${prefix}/dashboard`, icon: Home, label: "Home" },
      { to: prefix || "/book-class", icon: CalendarDays, label: "Book" },
      { to: `${prefix ? `${prefix}/credits` : "/wallet"}`, icon: Ticket, label: "My Passes" },
    ];
    const mobileNav = [
      ...nav,
      { to: "/profile", icon: User, label: "Profile" },
    ];
    return { nav, mobileNav };
  }, [studio_slug, prefix]);
}

export default function StudentLayout() {
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const { nav: NAV_ITEMS, mobileNav: MOBILE_NAV_ITEMS } = useStudentNavItems();
  const isMobile = useIsMobile();
  const [brandInfo, setBrandInfo] = useState<{ name: string; logo_url: string | null }>({ name: "My Studios", logo_url: null });

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "U";

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("studio_members")
        .select("studios:studio_id(name, logo_url)")
        .eq("user_id", user.id)
        .eq("role", "student" as any);
      const studios = (data ?? []).map((s: any) => ({
        name: (s.studios as any)?.name ?? "",
        logo_url: (s.studios as any)?.logo_url ?? null,
      })).filter((s: any) => s.name);
      if (studios.length === 1) {
        setBrandInfo({ name: studios[0].name, logo_url: studios[0].logo_url });
      }
    };
    load();
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Desktop Top Bar */}
      {!isMobile && (
        <header className="border-b bg-card sticky top-0 z-40">
          <div className="container flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              {brandInfo.logo_url ? (
                <img src={brandInfo.logo_url} alt={brandInfo.name} className="h-8 w-auto max-w-[140px] object-contain" />
              ) : (
                <span className="font-display text-lg font-bold text-foreground">{brandInfo.name}</span>
              )}
            </div>
            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/dashboard"}
                  className={({ isActive }) =>
                    `rounded-md px-3 py-1.5 text-sm transition-colors ${
                      isActive
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
                  {user?.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/profile" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    Profile
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
      )}

      {/* Page Content */}
      <main className={`flex-1 ${isMobile ? "pb-20" : ""}`}>
        <Outlet />
      </main>

      {/* Mobile Bottom Bar */}
      {isMobile && (
        <nav className="fixed bottom-0 inset-x-0 z-50 bg-card border-t shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-around h-16">
            {MOBILE_NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/dashboard"}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      )}

      {/* Powered by Footer (desktop only) */}
      {!isMobile && (
        <footer className="border-t bg-card/50 py-6 mt-auto">
          <div className="container flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60">
            <span>Powered by</span>
            <a href="https://kinspace.studio" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-muted-foreground transition-colors">
              Kinspace.Studio
            </a>
          </div>
        </footer>
      )}
    </div>
  );
}

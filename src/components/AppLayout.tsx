import { useAuth } from "@/contexts/AuthContext";
import { useStudio } from "@/contexts/StudioContext";
import StudioSwitcher from "./StudioSwitcher";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import { LogOut, LayoutDashboard, CalendarDays } from "lucide-react";
import { Outlet, Navigate } from "react-router-dom";
import { NavLink } from "./NavLink";

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const { memberships, loading } = useStudio();

  if (!user) return <Navigate to="/auth" replace />;
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>);
  }

  const initials = user.email?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="Kinspace logo" className="h-7 w-7" />
              <h1 className="font-display text-xl font-bold tracking-tight text-foreground">Kinspace</h1>
            </div>
            <div className="h-5 w-px bg-border" />
            <StudioSwitcher />
            <div className="h-5 w-px bg-border" />
            <nav className="flex items-center gap-1">
              <NavLink
                to="/dashboard"
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                activeClassName="bg-accent text-accent-foreground font-medium"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </NavLink>
              <NavLink
                to="/schedule"
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                activeClassName="bg-accent text-accent-foreground font-medium"
              >
                <CalendarDays className="h-4 w-4" />
                Schedule
              </NavLink>
            </nav>
          </div>
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
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
                {user.email}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="container py-8">
        <Outlet />
      </main>
    </div>);

}
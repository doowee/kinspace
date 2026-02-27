import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { StudioProvider } from "@/contexts/StudioContext";
import StudioGate from "./components/StudioGate";
import StudioThemeProvider from "./components/StudioThemeProvider";
import StudentLayout from "./components/StudentLayout";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Schedule from "./pages/Schedule";
import Students from "./pages/Students";
import InstructorsAdmin from "./pages/InstructorsAdmin";
import AppLayout from "./components/AppLayout";
import BookingPage from "./pages/BookingPage";
import PublicPackagesPage from "./pages/PublicPackagesPage";
import OrgRevenue from "./pages/OrgRevenue";
import Finance from "./pages/Finance";
import Settings from "./pages/Settings";
import Billing from "./pages/Billing";
import Wallet from "./pages/Wallet";
import Profile from "./pages/Profile";
import BookClass from "./pages/BookClass";
import NotFound from "./pages/NotFound";
import CreateStudio from "./pages/CreateStudio";
import InstructorPortal from "./pages/InstructorPortal";
import InstructorAuthGate from "./components/instructor/InstructorAuthGate";
import Index from "./pages/Index";

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function ThemedBookingPage() {
  const { studio_slug } = useParams<{ studio_slug: string }>();
  return (
    <StudioThemeProvider slug={studio_slug ?? ""}>
      <BookingPage />
    </StudioThemeProvider>
  );
}

function ThemedPackagesPage() {
  const { studio_slug } = useParams<{ studio_slug: string }>();
  return (
    <StudioThemeProvider slug={studio_slug ?? ""}>
      <PublicPackagesPage />
    </StudioThemeProvider>
  );
}

const App = () => {
  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      if (e.reason?.message?.includes?.("MetaMask") || e.reason?.toString?.().includes?.("MetaMask")) {
        e.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route index element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/onboarding"
              element={
                <AuthGate>
                  <Onboarding />
                </AuthGate>
              }
            />
            {/* Student layout with bottom/top nav */}
            <Route
              path="/create-studio"
              element={
                <AuthGate>
                  <StudioProvider>
                    <CreateStudio />
                  </StudioProvider>
                </AuthGate>
              }
            />
            <Route
              element={
                <AuthGate>
                  <StudentLayout />
                </AuthGate>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/book-class" element={<BookClass />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route
              element={
                <AuthGate>
                  <StudioGate>
                    <StudioProvider>
                      <AppLayout />
                    </StudioProvider>
                  </StudioGate>
                </AuthGate>
              }
            >
              <Route path="/admin" element={<Dashboard />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/students" element={<Students />} />
              <Route path="/instructors" element={<InstructorsAdmin />} />
              <Route path="/org-revenue" element={<OrgRevenue />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin/billing" element={<Billing />} />
            </Route>
            <Route path="/book/:studio_slug" element={<ThemedBookingPage />} />
            <Route path="/book/:studio_slug/packages" element={<ThemedPackagesPage />} />
            <Route
              path="/instructor-portal"
              element={
                <InstructorAuthGate>
                  <InstructorPortal />
                </InstructorAuthGate>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;

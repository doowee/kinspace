import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { StudioProvider } from "@/contexts/StudioContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Eager: landing page (LCP) + lightweight gates/layouts shared across routes
import Index from "./pages/Index";
import StudioGate from "./components/StudioGate";
import StudioThemeProvider from "./components/StudioThemeProvider";
import StudentLayout from "./components/StudentLayout";
import AppLayout from "./components/AppLayout";
import InstructorAuthGate from "./components/instructor/InstructorAuthGate";
import StudentAuthGate from "./components/student/StudentAuthGate";
import StudioBrandedLandingWrapper from "./components/StudioBrandedLandingWrapper";

// Lazy: every other route splits into its own chunk
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Schedule = lazy(() => import("./pages/Schedule"));
const Students = lazy(() => import("./pages/Students"));
const InstructorsAdmin = lazy(() => import("./pages/InstructorsAdmin"));
const BookingPage = lazy(() => import("./pages/BookingPage"));
const PublicPackagesPage = lazy(() => import("./pages/PublicPackagesPage"));
const OrgRevenue = lazy(() => import("./pages/OrgRevenue"));
const Finance = lazy(() => import("./pages/Finance"));
const Settings = lazy(() => import("./pages/Settings"));
const Billing = lazy(() => import("./pages/Billing"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Credits = lazy(() => import("./pages/Credits"));
const Profile = lazy(() => import("./pages/Profile"));
const BookClass = lazy(() => import("./pages/BookClass"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CreateStudio = lazy(() => import("./pages/CreateStudio"));
const InstructorPortal = lazy(() => import("./pages/InstructorPortal"));
const StudentDashboard = lazy(() => import("./components/dashboard/StudentDashboard"));
const KioskLogin = lazy(() => import("./pages/KioskLogin"));
const KioskLiveRoster = lazy(() => import("./pages/KioskLiveRoster"));
const KioskSchedule = lazy(() => import("./pages/KioskSchedule"));
const Features = lazy(() => import("./pages/Features"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Switch = lazy(() => import("./pages/Switch"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const Terms = lazy(() => import("./pages/legal/Terms"));
const Privacy = lazy(() => import("./pages/legal/Privacy"));

const queryClient = new QueryClient();

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">Loading…</div>
    </div>
  );
}


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
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route index element={<Index />} />
            <Route path="/features" element={<Features />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/switch" element={<Switch />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
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
            {/* /book-class and /credits have their own auth gate with login/signup */}
            <Route
              path="/book-class"
              element={
                <StudentAuthGate>
                  <StudentLayout />
                </StudentAuthGate>
              }
            >
              <Route index element={<BookClass />} />
            </Route>
            <Route
              path="/credits"
              element={
                <StudentAuthGate>
                  <StudentLayout />
                </StudentAuthGate>
              }
            >
              <Route index element={<Credits />} />
            </Route>
            {/* Other student routes still require auth */}
            <Route
              element={
                <AuthGate>
                  <StudentLayout />
                </AuthGate>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
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
              <Route path="/org-admin" element={<OrgRevenue />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin/billing" element={<Billing />} />
            </Route>
            <Route path="/book/:studio_slug" element={<ThemedBookingPage />} />
            <Route path="/book/:studio_slug/packages" element={<ThemedPackagesPage />} />
            {/* Branded student routes */}
            <Route
              path="/s/:studio_slug"
              element={
                <StudioBrandedLandingWrapper>
                  <StudentAuthGate>
                    <StudentLayout />
                  </StudentAuthGate>
                </StudioBrandedLandingWrapper>
              }
            >
              <Route index element={<BookClass />} />
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="credits" element={<Credits />} />
            </Route>
            {/* Branded staff route */}
            <Route
              path="/s/:studio_slug/staff"
              element={
                <StudioBrandedLandingWrapper>
                  <InstructorAuthGate>
                    <InstructorPortal />
                  </InstructorAuthGate>
                </StudioBrandedLandingWrapper>
              }
            />
            <Route
              path="/instructor-portal"
              element={
                <InstructorAuthGate>
                  <InstructorPortal />
                </InstructorAuthGate>
              }
            />
            {/* Kiosk Routes */}
            <Route
              path="/kiosk-login"
              element={
                <AuthGate>
                  <StudioProvider>
                    <KioskLogin />
                  </StudioProvider>
                </AuthGate>
              }
            />
            <Route
              path="/kiosk/schedule"
              element={
                <AuthGate>
                  <StudioProvider>
                    <KioskSchedule />
                  </StudioProvider>
                </AuthGate>
              }
            />
            <Route
              path="/kiosk/live/:classId"
              element={
                <AuthGate>
                  <StudioProvider>
                    <KioskLiveRoster />
                  </StudioProvider>
                </AuthGate>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStudioTheme } from "@/components/StudioThemeProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Ticket, ArrowLeft, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AuthModal from "@/components/booking/AuthModal";
import type { User } from "@supabase/supabase-js";

interface PublicPackage {
  id: string;
  name: string;
  price: number;
  credits: number;
  expiration_days: number;
}

export default function PublicPackagesPage() {
  const { studio_slug } = useParams<{ studio_slug: string }>();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get("return_url");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { studio, loading: themeLoading, notFound } = useStudioTheme();

  const [packages, setPackages] = useState<PublicPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const loading = themeLoading || packagesLoading;
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [pendingPackage, setPendingPackage] = useState<PublicPackage | null>(null);
  const [paymentModalPkg, setPaymentModalPkg] = useState<PublicPackage | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );
    supabase.auth.getSession().then(({ data: { session } }) =>
      setUser(session?.user ?? null)
    );
    return () => subscription.unsubscribe();
  }, []);

  // Fetch packages when studio is available
  useEffect(() => {
    if (!studio) { setPackagesLoading(false); return; }
    const fetchPackages = async () => {
      setPackagesLoading(true);
      const { data: pkgData } = await supabase
        .from("packages")
        .select("id, name, price, credits, expiration_days")
        .eq("studio_id", studio.id)
        .eq("active", true)
        .order("price", { ascending: true });
      setPackages((pkgData as PublicPackage[]) ?? []);
      setPackagesLoading(false);
    };
    fetchPackages();
  }, [studio?.id]);

  // After auth, retry pending purchase
  useEffect(() => {
    if (user && pendingPackage) {
      setPaymentModalPkg(pendingPackage);
      setPendingPackage(null);
    }
  }, [user]);

  const handleBuyClick = (pkg: PublicPackage) => {
    if (!user) {
      setPendingPackage(pkg);
      setAuthModalOpen(true);
      return;
    }
    setPaymentModalPkg(pkg);
  };

  const handleConfirmPayment = async () => {
    if (!user || !studio || !paymentModalPkg) return;
    const pkg = paymentModalPkg;
    setPurchasingId(pkg.id);

    try {
      // Ensure studio membership
      const { data: membership } = await supabase
        .from("studio_members")
        .select("id")
        .eq("user_id", user.id)
        .eq("studio_id", studio.id)
        .maybeSingle();

      if (!membership) {
        const { error: memberErr } = await supabase
          .from("studio_members")
          .insert({ user_id: user.id, studio_id: studio.id, role: "student" });
        if (memberErr) throw memberErr;
      }

      // Create transaction record
      const { error: txErr } = await supabase.from("transactions").insert({
        user_id: user.id,
        studio_id: studio.id,
        amount: pkg.price,
        payment_method: "transfer" as const,
        status: "completed" as const,
        description: `Manual purchase of ${pkg.name}`,
      });
      if (txErr) throw txErr;

      // Create student pass
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + pkg.expiration_days);

      const { error: passErr } = await supabase.from("student_passes").insert({
        user_id: user.id,
        studio_id: studio.id,
        package_id: pkg.id,
        credits_remaining: pkg.credits,
        expires_at: expiresAt.toISOString(),
      });
      if (passErr) throw passErr;

      setPaymentModalPkg(null);
      toast({
        title: "Package Activated!",
        description: "You can now book classes.",
      });

      if (returnUrl) {
        navigate(returnUrl);
      }
    } catch (err: any) {
      toast({
        title: "Purchase failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setPurchasingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (notFound || !studio) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-2">
        <img src="/kinspace-logo-sage.png" alt="Kinspace" className="h-12 w-12 mb-4 rounded-lg" />
        <h1 className="font-display text-2xl font-bold text-foreground">Studio not found</h1>
        <p className="text-muted-foreground">The studio you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="container flex h-16 items-center gap-3">
          {studio.logo_url ? (
            <img src={studio.logo_url} alt={studio.name} className="h-9 w-auto max-w-[140px] object-contain" />
          ) : (
            <span className="font-display text-xl font-bold text-foreground">{studio.name}</span>
          )}
          {studio.logo_url && (
            <div>
              <h1 className="font-display text-lg font-bold text-foreground leading-tight">
                {studio.name}
              </h1>
            </div>
          )}
          {studio.location && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {studio.location}
            </p>
          )}
        </div>
      </header>

      <main className="container py-10 animate-fade-in max-w-2xl">
        {returnUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="mb-6 gap-2"
            onClick={() => navigate(returnUrl)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Schedule
          </Button>
        )}

        <h2 className="font-display text-3xl font-bold text-foreground mb-2">
          Class Packages
        </h2>
        <p className="text-muted-foreground mb-8">
          Purchase a class pack to start booking sessions.
        </p>

        {packages.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground">
                No packages available at this time.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {packages.map((pkg) => (
              <Card key={pkg.id} className="overflow-hidden transition-shadow hover:shadow-lg">
                <CardContent className="p-0">
                  <div className="flex">
                    <div className="flex w-24 shrink-0 flex-col items-center justify-center bg-primary/10 py-6">
                      <Ticket className="h-6 w-6 text-primary mb-1" />
                      <span className="text-2xl font-bold text-primary">{pkg.credits}</span>
                      <span className="text-[10px] uppercase tracking-wider text-primary/70 font-medium">credits</span>
                    </div>
                    <div className="flex flex-1 items-center justify-between gap-3 p-5">
                      <div className="space-y-1 min-w-0">
                        <p className="font-display font-bold text-foreground">{pkg.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Valid for {pkg.expiration_days} days
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xl font-bold text-foreground">${pkg.price}</span>
                        <Button
                          size="sm"
                          disabled={purchasingId === pkg.id}
                          onClick={() => handleBuyClick(pkg)}
                        >
                          {purchasingId === pkg.id ? "Processing…" : "Buy"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t bg-card/50 py-8 mt-12">
        <div className="container flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <img src="/kinspace-logo-sage.png" alt="" className="h-4 w-4 rounded" />
          <span>Powered by Kinspace.Studio</span>
        </div>
      </footer>

      <Dialog open={!!paymentModalPkg} onOpenChange={(open) => !open && setPaymentModalPkg(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment for {paymentModalPkg?.name}</DialogTitle>
            <DialogDescription>Send payment to activate your package.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 rounded-lg bg-primary/10 p-4">
              <DollarSign className="h-6 w-6 text-primary" />
              <span className="text-2xl font-bold text-foreground">${paymentModalPkg?.price.toFixed(2)}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              To activate this package, please send payment via Zelle/Venmo to:{" "}
              <span className="font-semibold text-foreground">payments@kinspace.studio</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Include your email in the memo.
            </p>
          </div>
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            disabled={purchasingId === paymentModalPkg?.id}
            onClick={handleConfirmPayment}
          >
            {purchasingId === paymentModalPkg?.id ? "Processing…" : "I have sent the payment"}
          </Button>
        </DialogContent>
      </Dialog>

      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        onSuccess={() => {}}
      />
    </div>
  );
}

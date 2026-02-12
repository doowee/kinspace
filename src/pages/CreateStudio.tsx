import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useStudio } from "@/contexts/StudioContext";
import { createStudioWithMembership } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building2 } from "lucide-react";
import { Navigate } from "react-router-dom";

export default function CreateStudio() {
  const { user } = useAuth();
  const { refetch } = useStudio();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/auth" replace />;

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;
    setLoading(true);

    try {
      await createStudioWithMembership(name, slug, location || undefined);
      await refetch();
      toast({ title: "Studio created!", description: `${name} is ready to go.` });
      navigate("/");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
            <Building2 className="h-8 w-8 text-accent-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Create Your Studio
          </h1>
          <p className="mt-2 text-muted-foreground">
            Set up your Pilates studio in seconds
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl">Studio Details</CardTitle>
            <CardDescription>
              Give your studio a name. You can change this later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Studio Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Zen Pilates Studio"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. 123 Main St, New York"
                />
              </div>
              {slug && (
                <p className="text-sm text-muted-foreground">
                  URL slug: <span className="font-mono text-foreground">{slug}</span>
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading || !slug}>
                {loading ? "Creating..." : "Create Studio"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

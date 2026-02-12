import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { createStudioWithMembership } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";

export default function Onboarding() {
  const { user } = useAuth();
  const [name, setName] = useState("");
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
      await createStudioWithMembership(name, slug);
      toast({ title: "Studio created!", description: `${name} is ready to go.` });
      navigate("/dashboard");
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
          <h1 className="font-display text-3xl font-bold text-foreground">
            Welcome to Kinspace
          </h1>
          <p className="mt-2 text-muted-foreground">
            Let's create your first studio.
          </p>
        </div>

        <Card>
          <CardHeader />
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Studio Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Downtown Pilates"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Studio Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  readOnly
                  className="bg-muted font-mono text-sm"
                  placeholder="auto-generated-from-name"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !slug}>
                {loading ? "Creating..." : "Create Studio & Enter"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

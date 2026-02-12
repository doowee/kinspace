import { useEffect, useState } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Package {
  id: string;
  name: string;
  price: number;
  credits: number;
  expiration_days: number;
  active: boolean;
  created_at: string;
}

export default function PackagesTab() {
  const { activeStudio, activeRole } = useStudio();
  const { toast } = useToast();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [credits, setCredits] = useState("");
  const [expirationDays, setExpirationDays] = useState("90");
  const [saving, setSaving] = useState(false);

  const studioId = activeStudio?.id;
  const isOwner = activeRole === "owner";

  const fetchPackages = async () => {
    if (!studioId) return;
    setLoading(true);
    const { data } = await supabase
      .from("packages")
      .select("*")
      .eq("studio_id", studioId)
      .order("created_at", { ascending: false });
    setPackages((data as Package[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPackages();
  }, [studioId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studioId) return;
    const numPrice = parseFloat(price);
    const numCredits = parseInt(credits);
    const numDays = parseInt(expirationDays);
    if (!name.trim() || isNaN(numPrice) || isNaN(numCredits) || isNaN(numDays)) return;

    setSaving(true);
    const { error } = await supabase.from("packages").insert({
      studio_id: studioId,
      name: name.trim(),
      price: numPrice,
      credits: numCredits,
      expiration_days: numDays,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Package created" });
      setName("");
      setPrice("");
      setCredits("");
      setExpirationDays("90");
      setDialogOpen(false);
      fetchPackages();
    }
    setSaving(false);
  };

  const toggleActive = async (pkg: Package) => {
    const { error } = await supabase
      .from("packages")
      .update({ active: !pkg.active })
      .eq("id", pkg.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      fetchPackages();
    }
  };

  if (!studioId) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Packages</CardTitle>
          <CardDescription>Class packs and memberships for sale</CardDescription>
        </div>
        {isOwner && (
          <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New Package
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
        ) : packages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No packages yet. Create your first one to start selling.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Credits</TableHead>
                <TableHead className="text-right">Expires (days)</TableHead>
                <TableHead>Status</TableHead>
                {isOwner && <TableHead className="text-right">Toggle</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell className="font-medium">{pkg.name}</TableCell>
                  <TableCell className="text-right">${pkg.price}</TableCell>
                  <TableCell className="text-right">{pkg.credits}</TableCell>
                  <TableCell className="text-right">{pkg.expiration_days}</TableCell>
                  <TableCell>
                    <Badge variant={pkg.active ? "default" : "secondary"}>
                      {pkg.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {isOwner && (
                    <TableCell className="text-right">
                      <Switch checked={pkg.active} onCheckedChange={() => toggleActive(pkg)} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Package</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 10 Class Pack"
                maxLength={100}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Credits</Label>
                <Input
                  type="number"
                  min="1"
                  value={credits}
                  onChange={(e) => setCredits(e.target.value)}
                  placeholder="10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Expiration (days)</Label>
              <Input
                type="number"
                min="1"
                value={expirationDays}
                onChange={(e) => setExpirationDays(e.target.value)}
                placeholder="90"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating…" : "Create Package"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

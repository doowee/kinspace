import { useState } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Trash2, Package, Repeat, Pencil } from "lucide-react";

type ProductType = "pack" | "subscription";
type AccessScope = "single_studio" | "all_studios";

interface Product {
  id: string;
  studio_id: string | null;
  name: string;
  price: number;
  product_type: ProductType;
  point_value: number | null;
  access_scope: AccessScope | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ProductsTab() {
  const { activeStudio } = useStudio();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [productType, setProductType] = useState<ProductType>("pack");
  const [pointValue, setPointValue] = useState("");
  const [accessScope, setAccessScope] = useState<AccessScope>("single_studio");

  const studioId = activeStudio?.id;

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", studioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("studio_id", studioId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!studioId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const row: Record<string, unknown> = {
        studio_id: studioId,
        name,
        price: parseFloat(price) || 0,
        product_type: productType,
        point_value: productType === "pack" ? parseInt(pointValue) || null : null,
        access_scope: productType === "subscription" ? accessScope : null,
      };
      const { error } = await supabase.from("products").insert(row as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", studioId] });
      toast.success("Product created");
      resetForm();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingProduct) return;
      const row: Record<string, unknown> = {
        name,
        price: parseFloat(price) || 0,
        point_value: productType === "pack" ? parseInt(pointValue) || null : null,
        access_scope: productType === "subscription" ? accessScope : null,
      };
      const { error } = await supabase.from("products").update(row as any).eq("id", editingProduct.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", studioId] });
      toast.success("Product updated");
      resetForm();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", studioId] });
      toast.success("Product deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("products").update({ is_active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products", studioId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const resetForm = () => {
    setName("");
    setPrice("");
    setProductType("pack");
    setPointValue("");
    setAccessScope("single_studio");
    setEditingProduct(null);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setPrice(String(p.price));
    setProductType(p.product_type);
    setPointValue(p.point_value ? String(p.point_value) : "");
    setAccessScope(p.access_scope || "single_studio");
    setOpen(true);
  };

  if (!studioId) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Products & Memberships</CardTitle>
          <CardDescription>Manage class packs and subscription plans for your studio.</CardDescription>
        </div>
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Create Product
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !products?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No products yet. Create a class pack or subscription to get started.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <Badge variant={p.product_type === "pack" ? "secondary" : "default"} className="gap-1">
                      {p.product_type === "pack" ? <Package className="h-3 w-3" /> : <Repeat className="h-3 w-3" />}
                      {p.product_type === "pack" ? "Pack" : "Subscription"}
                    </Badge>
                  </TableCell>
                  <TableCell>${Number(p.price).toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {p.product_type === "pack" && p.point_value
                      ? `${p.point_value} credits`
                      : p.product_type === "subscription"
                        ? p.access_scope === "all_studios" ? "All Studios" : "Single Studio"
                        : "—"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={p.is_active}
                      onCheckedChange={(val) => toggleActiveMutation.mutate({ id: p.id, is_active: val })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(p.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create Product Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Product</DialogTitle>
            <DialogDescription>Add a class pack or unlimited subscription to your studio menu.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input placeholder="e.g. 10-Class Pack" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Price (USD)</Label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Product Type</Label>
              <Select value={productType} onValueChange={(v) => setProductType(v as ProductType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pack">Class Pack</SelectItem>
                  <SelectItem value="subscription">Unlimited Subscription</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {productType === "pack" && (
              <div className="space-y-2">
                <Label>Credits (Points) Granted</Label>
                <Input type="number" min="1" placeholder="10" value={pointValue} onChange={(e) => setPointValue(e.target.value)} />
              </div>
            )}
            {productType === "subscription" && (
              <div className="space-y-2">
                <Label>Access Scope</Label>
                <Select value={accessScope} onValueChange={(v) => setAccessScope(v as AccessScope)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_studio">Single Studio Access</SelectItem>
                    <SelectItem value="all_studios">All Studios Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!name || !price || createMutation.isPending}>
              {createMutation.isPending ? "Saving…" : "Save Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

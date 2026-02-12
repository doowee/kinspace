import { useEffect, useState } from "react";
import { getUserOrganizations, getOrgStudiosWithRevenue } from "@/lib/org-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Building2, TrendingUp } from "lucide-react";

interface Org {
  organization_id: string;
  role: string;
  organizations: {
    id: string;
    name: string;
    slug: string;
    created_at: string;
  };
}

interface StudioRevenue {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  revenue: number;
  transactions: number;
}

export default function OrgRevenue() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [studios, setStudios] = useState<StudioRevenue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserOrganizations().then((data) => {
      const ownerOrgs = (data as unknown as Org[]).filter((o) => o.role === "owner");
      setOrgs(ownerOrgs);
      if (ownerOrgs.length > 0) {
        setSelectedOrg(ownerOrgs[0].organization_id);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedOrg) return;
    getOrgStudiosWithRevenue(selectedOrg).then(setStudios);
  }, [selectedOrg]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (orgs.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">You are not an owner of any organization.</p>
      </div>
    );
  }

  const totalRevenue = studios.reduce((sum, s) => sum + s.revenue, 0);
  const totalTransactions = studios.reduce((sum, s) => sum + s.transactions, 0);
  const currentOrg = orgs.find((o) => o.organization_id === selectedOrg);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          {currentOrg?.organizations.name ?? "Organization"} — Revenue
        </h2>
        <p className="text-sm text-muted-foreground">
          Aggregated revenue across all connected studios
        </p>
      </div>

      {orgs.length > 1 && (
        <div className="flex gap-2">
          {orgs.map((o) => (
            <button
              key={o.organization_id}
              onClick={() => setSelectedOrg(o.organization_id)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                selectedOrg === o.organization_id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {o.organizations.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Studios</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studios.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue by Studio</CardTitle>
          <CardDescription>Real transaction data from all studios</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Studio</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studios.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.location ?? "—"}</TableCell>
                  <TableCell className="text-right">{s.transactions}</TableCell>
                  <TableCell className="text-right font-medium">${s.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
              {studios.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No studios in this organization yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

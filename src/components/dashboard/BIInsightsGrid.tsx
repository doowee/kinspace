import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Package } from "lucide-react";
import type { DashboardData } from "@/lib/studio-api";

interface BIInsightsGridProps {
  data: DashboardData;
}

export default function BIInsightsGrid({ data }: BIInsightsGridProps) {
  const { topClasses, recentTransactions } = data;

  // Build package aggregation from transactions
  const pkgAgg: Record<string, { revenue: number; units: number }> = {};
  for (const tx of recentTransactions) {
    const desc = tx.description || "Other";
    const a = (pkgAgg[desc] ??= { revenue: 0, units: 0 });
    a.revenue += tx.amount;
    a.units++;
  }
  const topPackages = Object.entries(pkgAgg)
    .map(([name, agg]) => ({ name, totalRevenue: agg.revenue, unitsSold: agg.units }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left: Top Classes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            Top Classes
          </CardTitle>
          <CardDescription>Ranked by total bookings</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {topClasses.length > 0 ? (
            <div className="space-y-4">
              {topClasses.slice(0, 5).map((cls, i) => {
                const fillRate = cls.bookings > 0 ? Math.min(100, Math.round((cls.bookings / Math.max(cls.bookings, 1)) * 100)) : 0;
                return (
                  <div key={cls.name + i} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-medium text-foreground">{cls.name}</p>
                        <span className="shrink-0 text-sm font-semibold text-foreground">{cls.bookings} bookings</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={fillRate} className="h-2" />
                        <span className="shrink-0 text-xs text-muted-foreground">{fillRate}% fill</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No class data yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Right: Best Selling Packages */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-muted-foreground" />
            Best Selling Packages
          </CardTitle>
          <CardDescription>Ranked by total revenue</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {topPackages.length > 0 ? (
            <div className="space-y-4">
              {topPackages.map((pkg, i) => (
                <div key={pkg.name + i} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-medium text-foreground">{pkg.name}</p>
                      <span className="shrink-0 text-sm font-bold text-foreground">
                        ${pkg.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{pkg.unitsSold} units sold</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No package data yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

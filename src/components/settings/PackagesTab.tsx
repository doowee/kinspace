import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function PackagesTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Packages</CardTitle>
        <CardDescription>Package management has been replaced by the new membership tier system on client profiles.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground text-center py-8">
          Use the membership_tier field on client profiles to manage access tiers (Drop-in, 10-Pack, VIP_Unlimited).
        </p>
      </CardContent>
    </Card>
  );
}

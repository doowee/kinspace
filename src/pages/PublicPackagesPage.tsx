import { Card, CardContent } from "@/components/ui/card";

export default function PublicPackagesPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-muted-foreground">
            Package purchasing has been replaced by the new membership system. Contact the studio directly to get started.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

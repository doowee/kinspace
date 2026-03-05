import { useParams } from "react-router-dom";
import StudioThemeProvider, { useStudioTheme } from "./StudioThemeProvider";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudioBrandedLandingWrapper({ children }: { children: React.ReactNode }) {
  const { studio_slug } = useParams<{ studio_slug: string }>();

  return (
    <StudioThemeProvider slug={studio_slug ?? ""}>
      <StudioBrandedGate>{children}</StudioBrandedGate>
    </StudioThemeProvider>
  );
}

function StudioBrandedGate({ children }: { children: React.ReactNode }) {
  const { studio, loading, notFound } = useStudioTheme();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-12 w-32 mx-auto rounded-xl" />
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (notFound || !studio) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Studio Not Found</h1>
          <p className="text-muted-foreground">This studio link doesn't exist. Please check the URL and try again.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

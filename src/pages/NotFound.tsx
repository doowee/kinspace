import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.warn("404 — non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center max-w-md space-y-6">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
          404 — Page not found
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground leading-tight">
          We couldn't find that page.
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          The link may be outdated or the page has moved. Let's get you back somewhere useful.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button asChild>
            <Link to="/">Back to home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

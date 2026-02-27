import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface ProUpgradeOverlayProps {
  children: React.ReactNode;
  locked: boolean;
  label?: string;
}

export default function ProUpgradeOverlay({ children, locked, label = "Upgrade to Pro" }: ProUpgradeOverlayProps) {
  const navigate = useNavigate();

  if (!locked) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-40 blur-[1px]">
        {children}
      </div>
      <button
        onClick={() => navigate("/billing")}
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/60 backdrop-blur-sm cursor-pointer transition-all hover:bg-background/70"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <Badge className="bg-primary text-primary-foreground text-xs px-3 py-1">
          ✨ {label}
        </Badge>
        <p className="text-xs text-muted-foreground max-w-[200px] text-center">
          This feature is available on the Pro Engine plan.
        </p>
      </button>
    </div>
  );
}

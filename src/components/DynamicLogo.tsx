import { useStudio } from "@/contexts/StudioContext";

interface DynamicLogoProps {
  /** Override logo URL (e.g. from StudioThemeProvider) */
  logoUrl?: string | null;
  /** Override studio name for monogram */
  studioName?: string | null;
  /** Size class for the logo image or monogram */
  className?: string;
  /** Size in px for monogram circle (default 32) */
  size?: number;
}

/**
 * DynamicLogo
 * - Renders the studio logo image if `logo_url` exists
 * - Falls back to a monogram badge using the studio's initials
 *   styled with theme tokens (bg-primary text-primary-foreground)
 */
export default function DynamicLogo({
  logoUrl,
  studioName,
  className,
  size = 32,
}: DynamicLogoProps) {
  // Resolve from context if not provided
  const studio = useStudioSafe();
  const resolvedUrl = logoUrl ?? (studio as any)?.logo_url ?? null;
  const resolvedName = studioName ?? studio?.name ?? "Studio";

  if (resolvedUrl) {
    return (
      <img
        src={resolvedUrl}
        alt={`${resolvedName} logo`}
        className={className ?? "h-8 w-auto object-contain"}
      />
    );
  }

  // Generate monogram from studio name
  const initials = resolvedName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold select-none shrink-0 ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
      }}
    >
      {initials || "S"}
    </div>
  );
}

/** Safe hook that doesn't throw outside StudioProvider */
function useStudioSafe() {
  try {
    const { activeStudio } = useStudio();
    return activeStudio;
  } catch {
    return null;
  }
}

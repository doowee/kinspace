import { useEffect, useState, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";

interface StudioBrand {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  logo_url: string | null;
  brand_primary: string;
  brand_secondary: string;
  brand_highlight: string;
}

interface StudioThemeContextType {
  studio: StudioBrand | null;
  loading: boolean;
  notFound: boolean;
}

const StudioThemeContext = createContext<StudioThemeContextType>({
  studio: null,
  loading: true,
  notFound: false,
});

export function useStudioTheme() {
  return useContext(StudioThemeContext);
}

/** Convert a hex color (#RRGGBB) to an HSL string "H S% L%" for CSS variables */
function hexToHSL(hex: string): string {
  let r = 0, g = 0, b = 0;
  const clean = hex.replace("#", "");
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16) / 255;
    g = parseInt(clean[1] + clean[1], 16) / 255;
    b = parseInt(clean[2] + clean[2], 16) / 255;
  } else {
    r = parseInt(clean.substring(0, 2), 16) / 255;
    g = parseInt(clean.substring(2, 4), 16) / 255;
    b = parseInt(clean.substring(4, 6), 16) / 255;
  }

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

interface Props {
  slug: string;
  children: React.ReactNode;
}

export default function StudioThemeProvider({ slug, children }: Props) {
  const [studio, setStudio] = useState<StudioBrand | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_public_studio_by_slug", { _slug: slug });
      if (error || !data || (data as any[]).length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const s = (data as any[])[0] as StudioBrand;
      setStudio(s);
      setLoading(false);
    };
    fetch();
  }, [slug]);

  // Apply CSS variables when studio loads
  useEffect(() => {
    if (!studio) return;
    const root = document.documentElement;

    // Apply brand colors as CSS custom properties
    if (studio.brand_primary) {
      root.style.setProperty("--studio-primary", hexToHSL(studio.brand_primary));
      root.style.setProperty("--primary", hexToHSL(studio.brand_primary));
      root.style.setProperty("--ring", hexToHSL(studio.brand_primary));
    }
    if (studio.brand_secondary) {
      root.style.setProperty("--studio-secondary", hexToHSL(studio.brand_secondary));
      root.style.setProperty("--secondary", hexToHSL(studio.brand_secondary));
    }
    if (studio.brand_highlight) {
      root.style.setProperty("--studio-highlight", hexToHSL(studio.brand_highlight));
      root.style.setProperty("--highlight", hexToHSL(studio.brand_highlight));
    }

    // Cleanup: restore defaults when unmounting
    return () => {
      root.style.removeProperty("--studio-primary");
      root.style.removeProperty("--studio-secondary");
      root.style.removeProperty("--studio-highlight");
      root.style.removeProperty("--primary");
      root.style.removeProperty("--secondary");
      root.style.removeProperty("--highlight");
      root.style.removeProperty("--ring");
    };
  }, [studio]);

  return (
    <StudioThemeContext.Provider value={{ studio, loading, notFound }}>
      {children}
    </StudioThemeContext.Provider>
  );
}

import { useEffect, useState, createContext, useContext } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface StudioBrand {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  logo_url: string | null;
  brand_primary: string;
  brand_secondary: string;
  brand_highlight: string;
  brand_text: string;
  brand_background: string | null;
}

interface StudioThemeContextType {
  studio: StudioBrand | null;
  loading: boolean;
  notFound: boolean;
}

const StudioThemeContext = createContext<StudioThemeContextType | null>(null);

export function useStudioTheme() {
  const ctx = useContext(StudioThemeContext);
  if (!ctx) throw new Error("useStudioTheme must be used inside StudioThemeProvider");
  return ctx;
}

/** Safe version that returns null when outside provider */
export function useStudioThemeMaybe(): StudioThemeContextType | null {
  return useContext(StudioThemeContext);
}

/** Default Kinspace brand colours (HSL values matching index.css) */
const DEFAULTS = {
  primary: "150 12% 55%",
  "primary-foreground": "50 52% 93%",
  secondary: "12 62% 68%",
  ring: "150 12% 55%",
};

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
  slug?: string;
  children: React.ReactNode;
}

export default function StudioThemeProvider({ slug: slugProp, children }: Props) {
  const params = useParams<{ slug?: string; studio_slug?: string }>();
  const { user } = useAuth();

  const resolvedSlug = slugProp || params.slug || params.studio_slug;

  const [studio, setStudio] = useState<StudioBrand | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!resolvedSlug) {
      if (user) {
        fetchHomeStudio(user.id);
      } else {
        setLoading(false);
      }
      return;
    }

    const fetchBySlug = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_public_studio_by_slug", { _slug: resolvedSlug });
      if (error || !data || (data as any[]).length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setStudio((data as any[])[0] as StudioBrand);
      setLoading(false);
    };

    fetchBySlug();
  }, [resolvedSlug, user?.id]);

  const fetchHomeStudio = async (userId: string) => {
    setLoading(true);
    const { data: bookings } = await supabase
      .from("bookings")
      .select("studio_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!bookings || bookings.length === 0) {
      setLoading(false);
      return;
    }

    const studioId = bookings[0].studio_id;
    const { data: studios } = await supabase
      .from("studios")
      .select("id, name, slug, location, logo_url, brand_primary, brand_secondary, brand_highlight, brand_text, brand_background")
      .eq("id", studioId)
      .limit(1);

    if (studios && studios.length > 0) {
      setStudio(studios[0] as unknown as StudioBrand);
    }
    setLoading(false);
  };

  useEffect(() => {
    const root = document.documentElement;
    const vars: string[] = [];

    const set = (name: string, value: string) => {
      root.style.setProperty(name, value);
      vars.push(name);
    };

    if (studio) {
      if (studio.brand_primary) {
        const hsl = hexToHSL(studio.brand_primary);
        set("--primary", hsl);
        set("--ring", hsl);
        set("--studio-primary", hsl);
      }
      if (studio.brand_secondary) {
        const hsl = hexToHSL(studio.brand_secondary);
        set("--secondary", hsl);
        set("--studio-secondary", hsl);
      }
      if (studio.brand_highlight) {
        const hsl = hexToHSL(studio.brand_highlight);
        set("--highlight", hsl);
        set("--studio-highlight", hsl);
      }
      if (studio.brand_text) {
        const hsl = hexToHSL(studio.brand_text);
        set("--primary-foreground", hsl);
      }
      if (studio.brand_background) {
        const hsl = hexToHSL(studio.brand_background);
        set("--background", hsl);
      }
    }

    return () => {
      vars.forEach((v) => root.style.removeProperty(v));
    };
  }, [studio]);

  return (
    <StudioThemeContext.Provider value={{ studio, loading, notFound }}>
      {children}
    </StudioThemeContext.Provider>
  );
}

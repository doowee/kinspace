import { useEffect } from "react";

/**
 * useDynamicFavicon
 * Updates the document favicon whenever the logo URL changes.
 * Falls back to a primary-colored circle SVG when no logo is set.
 */
export function useDynamicFavicon(logoUrl: string | null | undefined) {
  useEffect(() => {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }

    if (logoUrl) {
      link.href = logoUrl;
      link.type = "image/png";
    } else {
      // Generate a simple SVG circle favicon using primary color
      // Read the computed --primary CSS variable
      const root = getComputedStyle(document.documentElement);
      const primaryHSL = root.getPropertyValue("--primary").trim();
      const color = primaryHSL ? `hsl(${primaryHSL})` : "#1A1C1A";

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="${color}"/></svg>`;
      link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
      link.type = "image/svg+xml";
    }
  }, [logoUrl]);
}

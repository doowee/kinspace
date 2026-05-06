import { useEffect } from "react";

/**
 * Set the document <title> and (optionally) the meta description for the current route.
 * Resets to the previous values on unmount so SPA navigation stays clean.
 */
export function useDocumentTitle(title: string, description?: string) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    let prevDesc: string | null = null;
    let descTag: HTMLMetaElement | null = null;
    if (description) {
      descTag = document.querySelector('meta[name="description"]');
      if (!descTag) {
        descTag = document.createElement("meta");
        descTag.setAttribute("name", "description");
        document.head.appendChild(descTag);
      }
      prevDesc = descTag.getAttribute("content");
      descTag.setAttribute("content", description);
    }

    return () => {
      document.title = prevTitle;
      if (descTag && prevDesc !== null) descTag.setAttribute("content", prevDesc);
    };
  }, [title, description]);
}

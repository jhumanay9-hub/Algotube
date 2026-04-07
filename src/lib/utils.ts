import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Detect environment from hostname at runtime (client-side)
const isLocalhost =
  typeof window !== "undefined" && window.location.hostname === "localhost";

// Image/Uploads Base URL - Points to appropriate uploads directory
const IMAGE_BASE = isLocalhost
  ? "http://localhost/Algotube/uploads"
  : "http://algotube.gt.tc/uploads";

export function getMediaUrl(path: string | null | undefined | Blob): string {
  if (!path || typeof path === "object") return "";
  if (path.startsWith("http")) return path;

  const cleanPath = path.startsWith("/") ? path.substring(1) : path;

  // If path already includes 'uploads' or 'Algotube', adjust accordingly
  if (cleanPath.startsWith("Algotube/uploads/")) {
    return `${isLocalhost ? "http://localhost" : "http://algotube.gt.tc"}/${cleanPath}`;
  }

  return `${IMAGE_BASE}/${cleanPath}`;
}

/**
 * Environment Configuration
 * Automatically switches between local development and production environments
 * based on the current hostname.
 */

// Detect environment from hostname at runtime (client-side)
const isLocalhost =
  typeof window !== "undefined" && window.location.hostname === "localhost";

// API Base URL - Points to appropriate backend
export const API_BASE = isLocalhost
  ? "http://localhost/Algotube/api"
  : "http://algotube.gt.tc/api";

// Image/Uploads Base URL - Points to appropriate uploads directory
export const IMAGE_BASE = isLocalhost
  ? "http://localhost/Algotube/uploads"
  : "http://algotube.gt.tc/uploads";

/**
 * Helper to construct full API URL
 * @param endpoint - API endpoint (e.g., 'get_feed.php')
 * @param params - Optional query parameters
 * @returns Full API URL
 */
export function getApiUrl(
  endpoint: string,
  params?: Record<string, string | number>,
): string {
  const queryString = params
    ? "?" +
      new URLSearchParams(
        Object.entries(params).reduce(
          (acc, [key, value]) => {
            acc[key] = String(value);
            return acc;
          },
          {} as Record<string, string>,
        ),
      ).toString()
    : "";

  return `${API_BASE}/${endpoint}${queryString}`;
}

/**
 * Helper to construct full image/media URL
 * @param path - Relative path (e.g., 'avatars/default.png' or '/uploads/thumbnails/img.jpg')
 * @returns Full image URL
 */
export function getMediaUrl(path: string | null | undefined | Blob): string {
  if (!path || typeof path === "object") return "";
  if (path.startsWith("http")) return path;

  // Remove leading slash if present
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;

  // If path already includes 'uploads' or 'Algotube', adjust accordingly
  if (cleanPath.startsWith("Algotube/uploads/")) {
    return `${isLocalhost ? "http://localhost" : "http://algotube.gt.tc"}/${cleanPath}`;
  }

  return `${IMAGE_BASE}/${cleanPath}`;
}

/**
 * Helper to construct full page URL
 * @param path - Page path (e.g., '/video/123')
 * @returns Full page URL for static export
 */
export function getPageUrl(path: string): string {
  // For static export, we use relative paths
  // trailingSlash: true in next.config.ts will handle folder structure
  return path;
}

// Export environment flag for conditional logic
export const IS_PRODUCTION = !isLocalhost;
export const IS_DEVELOPMENT = isLocalhost;

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const XAMPP_BASE_URL = '/';

export function getMediaUrl(path: string | null | undefined) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  // Normalized for InfinityFree where files are in the root
  return `/${cleanPath}`;
}

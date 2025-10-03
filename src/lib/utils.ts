// Utility functions for the application
// This module provides common utility functions used throughout the app

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes
 * 
 * This function combines clsx (for conditional classes) with tailwind-merge
 * (for proper Tailwind class merging and deduplication).
 * 
 * @param inputs - Array of class values (strings, objects, arrays, etc.)
 * @returns Merged and deduplicated class string
 * 
 * @example
 * cn("px-2 py-1", "px-4") // Returns "py-1 px-4" (px-2 is overridden by px-4)
 * cn("text-red-500", { "text-blue-500": isBlue }) // Conditional classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

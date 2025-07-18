import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * General utility functions for the application.
 */

/**
 * Get the base URL for the application, preferring the environment variable.
 * Falls back to a default for local development.
 * @returns {string} The base URL.
 */
export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

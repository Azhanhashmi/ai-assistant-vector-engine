import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n) + '…' : str
}

export function scoreToPercent(score: number) {
  // Cosine similarity: typically 0-1, convert to %
  return Math.round(Math.min(score * 100, 100))
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 30) return `${diffDay}d ago`
  return date.toLocaleDateString()
}

const ID_COLORS = [
  "bg-emerald-500/15 text-emerald-400",
  "bg-violet-500/15 text-violet-400",
  "bg-blue-500/15 text-blue-400",
  "bg-amber-500/15 text-amber-400",
  "bg-rose-500/15 text-rose-400",
  "bg-teal-500/15 text-teal-400",
  "bg-indigo-500/15 text-indigo-400",
  "bg-orange-500/15 text-orange-400",
]

export function getIdColor(id: number): string {
  return ID_COLORS[id % ID_COLORS.length]
}

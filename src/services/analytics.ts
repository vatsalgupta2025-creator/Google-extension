import type { SiteCategory, DailyAnalytics, WebsiteStats } from '../types'

// ─── Domain Categorization ───────────────────────────────────────────────────

const DOMAIN_CATEGORIES: Record<string, SiteCategory> = {
  // Coding / Productive
  'github.com': 'coding',
  'gitlab.com': 'coding',
  'stackoverflow.com': 'coding',
  'leetcode.com': 'coding',
  'codeforces.com': 'coding',
  'hackerrank.com': 'coding',
  'codepen.io': 'coding',
  'replit.com': 'coding',
  'codesandbox.io': 'coding',
  'vercel.com': 'work',
  'netlify.com': 'work',

  // Education
  'coursera.org': 'education',
  'udemy.com': 'education',
  'khanacademy.org': 'education',
  'edx.org': 'education',
  'brilliant.org': 'education',
  'geeksforgeeks.org': 'education',
  'medium.com': 'education',
  'dev.to': 'education',
  'freecodecamp.org': 'education',
  'docs.google.com': 'work',
  'notion.so': 'work',
  'obsidian.md': 'work',

  // AI Tools
  'chat.openai.com': 'productive',
  'chatgpt.com': 'productive',
  'claude.ai': 'productive',
  'gemini.google.com': 'productive',
  'perplexity.ai': 'productive',

  // Neutral
  'google.com': 'search',
  'bing.com': 'search',
  'duckduckgo.com': 'search',
  'gmail.com': 'email',
  'outlook.com': 'email',
  'mail.google.com': 'email',
  'calendar.google.com': 'work',

  // Social / Entertainment
  'youtube.com': 'entertainment',
  'instagram.com': 'social',
  'twitter.com': 'social',
  'x.com': 'social',
  'facebook.com': 'social',
  'tiktok.com': 'social',
  'reddit.com': 'social',
  'discord.com': 'social',
  'twitch.tv': 'entertainment',
  'netflix.com': 'entertainment',
  'spotify.com': 'entertainment',
  'primevideo.com': 'entertainment',
  'hotstar.com': 'entertainment',
}

export function categorizeDomain(
  domain: string,
  overrides: Record<string, SiteCategory> = {}
): SiteCategory {
  if (overrides[domain]) return overrides[domain]
  const clean = domain.replace(/^www\./, '')
  if (DOMAIN_CATEGORIES[clean]) return DOMAIN_CATEGORIES[clean]
  // Heuristic fallback
  if (clean.includes('docs') || clean.includes('learn') || clean.includes('tutorial'))
    return 'education'
  if (clean.includes('code') || clean.includes('dev')) return 'coding'
  if (clean.includes('mail') || clean.includes('inbox')) return 'email'
  return 'neutral'
}

export function isProductiveCategory(cat: SiteCategory): boolean {
  return ['productive', 'education', 'coding', 'work'].includes(cat)
}

export function isDistractingCategory(cat: SiteCategory): boolean {
  return ['social', 'entertainment', 'distracting', 'gaming'].includes(cat)
}

// ─── Productivity Score ───────────────────────────────────────────────────────

export function calcProductivityScore(analytics: DailyAnalytics): number {
  const totalSecs = analytics.totalBrowserSeconds || 1
  const prodPct = analytics.productiveSeconds / totalSecs
  const distPct = analytics.distractingSeconds / totalSecs
  const goalPct =
    analytics.goalsTotal > 0 ? analytics.goalsCompleted / analytics.goalsTotal : 0.5

  // Weighted score: productivity 40% + inverse distraction 30% + goals 30%
  const score = Math.round((prodPct * 40 + (1 - distPct) * 30 + goalPct * 30) * 100) / 100
  return Math.min(100, Math.max(0, Math.round(score * 100)))
}

// ─── Time Formatting ─────────────────────────────────────────────────────────

export function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function formatMinutes(minutes: number): string {
  return formatSeconds(minutes * 60)
}

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

export function getDateDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

export function getGreeting(name: string): string {
  const h = new Date().getHours()
  if (h < 12) return `Good morning, ${name} 👋`
  if (h < 17) return `Good afternoon, ${name} 👋`
  if (h < 21) return `Good evening, ${name} 👋`
  return `Good night, ${name} 🌙`
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ─── AI Context Builder ───────────────────────────────────────────────────────

export function buildAIContext(
  analytics: DailyAnalytics,
  notes: string,
  userName: string,
  weeklyTrend?: { date: string; score: number }[]
) {
  return {
    date: analytics.date,
    userName,
    goalsCompleted: analytics.goalsCompleted,
    goalsTotal: analytics.goalsTotal,
    productiveMinutes: Math.round(analytics.productiveSeconds / 60),
    distractingMinutes: Math.round(analytics.distractingSeconds / 60),
    neutralMinutes: Math.round(analytics.neutralSeconds / 60),
    topSites: analytics.topSites.slice(0, 5).map((s) => ({
      domain: s.domain,
      minutes: Math.round(s.seconds / 60),
      category: s.category,
    })),
    notes,
    weeklyTrend,
  }
}

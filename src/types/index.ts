// ─── Core Types ─────────────────────────────────────────────────────────────

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type GoalStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'
export type GoalCategory = 'DSA' | 'Project' | 'Study' | 'Work' | 'Health' | 'Reading' | 'Other'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type Mood = 'burned_out' | 'meh' | 'okay' | 'great' | 'fire'
export type Recurrence = 'none' | 'daily' | 'weekly'

export type SiteCategory =
  | 'productive'
  | 'education'
  | 'coding'
  | 'work'
  | 'neutral'
  | 'search'
  | 'email'
  | 'social'
  | 'entertainment'
  | 'distracting'
  | 'gaming'
  | 'custom'

export interface Goal {
  id: string
  title: string
  type: 'binary' | 'numeric'
  target: number
  unit?: string
  isMandatory: boolean
  reminderTime?: string // "HH:MM" format
  currentProgress: number
  deadline: string // ISO date string "YYYY-MM-DD"
  createdAt: number
  updatedAt: number
}

export interface GoalCompletion {
  id: string
  goalId: string
  date: string
  completedAt: number
}

export interface DailyNote {
  id: string
  date: string // YYYY-MM-DD
  accomplished?: string
  wentWrong?: string
  improve?: string
  freeNote?: string
  createdAt: number
  updatedAt: number
}

export interface WebsiteVisit {
  id: string
  domain: string
  url: string
  title?: string
  startTime: number
  endTime?: number
  durationSeconds: number
  date: string // YYYY-MM-DD
}

export interface WebsiteStats {
  domain: string
  category: SiteCategory
  totalSeconds: number
  visitCount: number
  lastVisit: number
  date: string
  userOverride?: SiteCategory
}

export interface DailyAnalytics {
  date: string
  productiveSeconds: number
  distractingSeconds: number
  neutralSeconds: number
  totalBrowserSeconds: number
  goalsTotal: number
  goalsCompleted: number
  topSites: { domain: string; seconds: number; category: SiteCategory }[]
  productivityScore: number
}

export interface WeeklyAnalytics {
  weekStart: string
  days: DailyAnalytics[]
  avgProductivityScore: number
  totalProductiveSeconds: number
  totalDistractingSeconds: number
  goalCompletionRate: number
}

export interface AIInsight {
  id: string
  date: string
  observation: string
  explanation: string
  recommendation: string
  generatedAt: number
}

export interface AIContext {
  date: string
  userName: string
  goalsCompleted: number
  goalsTotal: number
  productiveMinutes: number
  distractingMinutes: number
  neutralMinutes: number
  topSites: { domain: string; minutes: number; category: SiteCategory }[]
  notes?: string
  weeklyTrend?: { date: string; score: number }[]
}

export interface UserProfile {
  name: string
  email?: string
  currentFocus: string[]
  learningGoals: string[]
  preferredStudyTime: 'morning' | 'afternoon' | 'evening' | 'night'
  dailyTargetHours: number
  priorities: string[]
  aiApiKey?: string
  aiProvider: 'openai' | 'gemini' | 'none'
  updatedAt: number
}

export interface AppSettings {
  trackingEnabled: boolean
  trackBrowsing: boolean
  trackTime: boolean
  trackHistory: boolean
  aiEnabled: boolean
  aiDataAccess: {
    goals: boolean
    browsing: boolean
    notes: boolean
    profile: boolean
  }
  theme: 'light' | 'dark' | 'auto'
  updatedAt: number
}

export interface CategoryOverride {
  domain: string
  category: SiteCategory
  updatedAt: number
}

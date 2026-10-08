import { openDB } from 'idb'
import type { IDBPDatabase } from 'idb'
import type {
  Goal,
  GoalCompletion,
  DailyNote,
  WebsiteVisit,
  WebsiteStats,
  DailyAnalytics,
  AIInsight,
  UserProfile,
  AppSettings,
  CategoryOverride,
} from '../types'

const DB_NAME = 'Daymark-db'
const DB_VERSION = 1

let db: IDBPDatabase | null = null

export async function getDB(): Promise<IDBPDatabase> {
  if (db) return db
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      // Goals
      if (!database.objectStoreNames.contains('goals')) {
        const goalsStore = database.createObjectStore('goals', { keyPath: 'id' })
        goalsStore.createIndex('deadline', 'deadline')
        goalsStore.createIndex('status', 'status')
      }

      // Goal completions
      if (!database.objectStoreNames.contains('goal_completions')) {
        const gc = database.createObjectStore('goal_completions', { keyPath: 'id' })
        gc.createIndex('date', 'date')
        gc.createIndex('goalId', 'goalId')
      }

      // Daily notes
      if (!database.objectStoreNames.contains('daily_notes')) {
        const dn = database.createObjectStore('daily_notes', { keyPath: 'id' })
        dn.createIndex('date', 'date', { unique: true })
      }

      // Website visits
      if (!database.objectStoreNames.contains('website_visits')) {
        const wv = database.createObjectStore('website_visits', { keyPath: 'id' })
        wv.createIndex('date', 'date')
        wv.createIndex('domain', 'domain')
      }

      // Website stats
      if (!database.objectStoreNames.contains('website_stats')) {
        const ws = database.createObjectStore('website_stats', { keyPath: 'id' })
        ws.createIndex('date', 'date')
        ws.createIndex('domain', 'domain')
      }

      // Daily analytics
      if (!database.objectStoreNames.contains('daily_analytics')) {
        const da = database.createObjectStore('daily_analytics', { keyPath: 'date' })
      }

      // AI insights
      if (!database.objectStoreNames.contains('ai_insights')) {
        const ai = database.createObjectStore('ai_insights', { keyPath: 'id' })
        ai.createIndex('date', 'date')
      }

      // Category overrides
      if (!database.objectStoreNames.contains('category_overrides')) {
        database.createObjectStore('category_overrides', { keyPath: 'domain' })
      }
    },
  })
  return db
}

// ─── Goals ──────────────────────────────────────────────────────────────────

export async function saveGoal(goal: Goal): Promise<void> {
  const db = await getDB()
  await db.put('goals', goal)
}

export async function getAllGoals(): Promise<Goal[]> {
  const db = await getDB()
  return db.getAll('goals')
}

export async function getGoalsByDeadline(date: string): Promise<Goal[]> {
  const db = await getDB()
  return db.getAllFromIndex('goals', 'deadline', date)
}

export async function deleteGoal(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('goals', id)
}

// ─── Goal Completions ────────────────────────────────────────────────────────

export async function saveCompletion(completion: GoalCompletion): Promise<void> {
  const db = await getDB()
  await db.put('goal_completions', completion)
}

export async function getCompletionsByDate(date: string): Promise<GoalCompletion[]> {
  const db = await getDB()
  return db.getAllFromIndex('goal_completions', 'date', date)
}

// ─── Daily Notes ─────────────────────────────────────────────────────────────

export async function saveDailyNote(note: DailyNote): Promise<void> {
  const db = await getDB()
  await db.put('daily_notes', note)
}

export async function getDailyNote(date: string): Promise<DailyNote | undefined> {
  const db = await getDB()
  return db.getFromIndex('daily_notes', 'date', date)
}

export async function getAllDailyNotes(): Promise<DailyNote[]> {
  const db = await getDB()
  return db.getAll('daily_notes')
}

// ─── Website Visits ──────────────────────────────────────────────────────────

export async function saveWebsiteVisit(visit: WebsiteVisit): Promise<void> {
  const db = await getDB()
  await db.put('website_visits', visit)
}

export async function getVisitsByDate(date: string): Promise<WebsiteVisit[]> {
  const db = await getDB()
  return db.getAllFromIndex('website_visits', 'date', date)
}

// ─── Website Stats ───────────────────────────────────────────────────────────

export async function saveWebsiteStats(stats: WebsiteStats): Promise<void> {
  const db = await getDB()
  await db.put('website_stats', stats)
}

export async function getStatsByDate(date: string): Promise<WebsiteStats[]> {
  const db = await getDB()
  return db.getAllFromIndex('website_stats', 'date', date)
}

// ─── Daily Analytics ─────────────────────────────────────────────────────────

export async function saveDailyAnalytics(analytics: DailyAnalytics): Promise<void> {
  const db = await getDB()
  await db.put('daily_analytics', analytics)
}

export async function getDailyAnalytics(date: string): Promise<DailyAnalytics | undefined> {
  const db = await getDB()
  return db.get('daily_analytics', date)
}

export async function getAnalyticsRange(
  startDate: string,
  endDate: string
): Promise<DailyAnalytics[]> {
  const db = await getDB()
  const all = await db.getAll('daily_analytics')
  return all.filter((a) => a.date >= startDate && a.date <= endDate)
}

// ─── AI Insights ─────────────────────────────────────────────────────────────

export async function saveAIInsight(insight: AIInsight): Promise<void> {
  const db = await getDB()
  await db.put('ai_insights', insight)
}

export async function getAIInsightByDate(date: string): Promise<AIInsight | undefined> {
  const db = await getDB()
  const all = await db.getAllFromIndex('ai_insights', 'date', date)
  return all[0]
}

// ─── Category Overrides ──────────────────────────────────────────────────────

export async function saveCategoryOverride(override: CategoryOverride): Promise<void> {
  const db = await getDB()
  await db.put('category_overrides', override)
}

export async function getAllCategoryOverrides(): Promise<CategoryOverride[]> {
  const db = await getDB()
  return db.getAll('category_overrides')
}

// ─── User Profile & Settings (chrome.storage) ────────────────────────────────

export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get('userProfile')
      return (result.userProfile as UserProfile) || null
    }
    const raw = localStorage.getItem('userProfile')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ userProfile: profile })
    } else {
      localStorage.setItem('userProfile', JSON.stringify(profile))
    }
  } catch (e) {
    localStorage.setItem('userProfile', JSON.stringify(profile))
  }
}

export async function getAppSettings(): Promise<AppSettings> {
  const defaults: AppSettings = {
    trackingEnabled: true,
    trackBrowsing: true,
    trackTime: true,
    trackHistory: true,
    aiEnabled: true,
    aiDataAccess: { goals: true, browsing: true, notes: true, profile: true },
    theme: 'light',
    updatedAt: Date.now(),
  }
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get('appSettings')
      return { ...defaults, ...(result.appSettings || {}) }
    }
    const raw = localStorage.getItem('appSettings')
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults
  } catch {
    return defaults
  }
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ appSettings: settings })
    } else {
      localStorage.setItem('appSettings', JSON.stringify(settings))
    }
  } catch (e) {
    localStorage.setItem('appSettings', JSON.stringify(settings))
  }
}

// ─── Data Management ─────────────────────────────────────────────────────────

export async function deleteAllData(): Promise<void> {
  const database = await getDB()
  const stores = [
    'goals',
    'goal_completions',
    'daily_notes',
    'website_visits',
    'website_stats',
    'daily_analytics',
    'ai_insights',
    'category_overrides',
  ]
  for (const store of stores) {
    await database.clear(store)
  }
  localStorage.clear()
}

export async function exportAllData(): Promise<Record<string, unknown>> {
  const database = await getDB()
  const data: Record<string, unknown> = {}
  const stores = [
    'goals',
    'goal_completions',
    'daily_notes',
    'website_visits',
    'website_stats',
    'daily_analytics',
    'ai_insights',
    'category_overrides',
  ]
  for (const store of stores) {
    data[store] = await database.getAll(store)
  }
  return data
}

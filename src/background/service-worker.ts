// Background Service Worker — Daymark
// Real-time tab time tracking + Streak Engine + Goal Reminders

// ─── Analytics Helpers ───
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

const DOMAIN_CATEGORIES: Record<string, string> = {
  'github.com': 'coding', 'gitlab.com': 'coding', 'stackoverflow.com': 'coding',
  'leetcode.com': 'coding', 'vercel.com': 'work', 'netlify.com': 'work',
  'coursera.org': 'education', 'udemy.com': 'education', 'docs.google.com': 'work',
  'notion.so': 'work', 'chatgpt.com': 'productive', 'claude.ai': 'productive',
  'google.com': 'search', 'gmail.com': 'email', 'calendar.google.com': 'work',
  'youtube.com': 'entertainment', 'instagram.com': 'social', 'twitter.com': 'social',
  'x.com': 'social', 'reddit.com': 'social', 'discord.com': 'social',
  'netflix.com': 'entertainment'
}

function categorizeDomain(domain: string): string {
  const clean = domain.replace(/^www\./, '')
  if (DOMAIN_CATEGORIES[clean]) return DOMAIN_CATEGORIES[clean]
  if (clean.includes('docs') || clean.includes('learn') || clean.includes('tutorial')) return 'education'
  if (clean.includes('code') || clean.includes('dev')) return 'coding'
  if (clean.includes('mail') || clean.includes('inbox')) return 'email'
  return 'neutral'
}

let activeTabId: number | null = null
let activeUrl: string | null = null
let activeStart: number | null = null

// ─── Tab Event Listeners ──────────────────────────────────────────────────────
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  await flushActiveSession()
  try {
    const tab = await chrome.tabs.get(tabId)
    startTracking(tabId, tab.url || '')
  } catch {}
})

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tabId === activeTabId) {
    await flushActiveSession()
    startTracking(tabId, tab.url || '')
  }
})

chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (tabId === activeTabId) {
    await flushActiveSession()
    activeTabId = null
    activeUrl = null
    activeStart = null
    chrome.storage.local.set({ activeDomain: '', activeStartTime: 0 })
  }
})

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await flushActiveSession()
    activeStart = null
    chrome.storage.local.set({ activeDomain: '', activeStartTime: 0 })
  } else {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.id) startTracking(tab.id, tab.url || '')
    } catch {}
  }
})

// ─── Core Tracking Functions ──────────────────────────────────────────────────
function startTracking(tabId: number, url: string) {
  try {
    if (
      !url ||
      url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('about:')
    ) return
    const domain = new URL(url).hostname.replace(/^www\./, '')
    if (!domain) return
    activeTabId = tabId
    activeUrl = domain
    activeStart = Date.now()
    // Persist activeStartTime so the dashboard can compute real-time elapsed
    chrome.storage.local.set({ activeDomain: domain, activeStartTime: activeStart })
  } catch {}
}

async function flushActiveSession() {
  if (!activeUrl || !activeStart) return
  const elapsed = Math.floor((Date.now() - activeStart) / 1000)
  if (elapsed < 2) return

  const domain = activeUrl
  const category = categorizeDomain(domain)
  const date = getTodayDate()

  const stored = await chrome.storage.local.get(['todayStats', 'statsDate'])
  let todayStats: Record<string, any> = {}
  if (stored.statsDate === date && stored.todayStats) {
    todayStats = stored.todayStats
  }

  if (!todayStats[domain]) {
    todayStats[domain] = { seconds: 0, visits: 0, category, date }
  }
  todayStats[domain].seconds += elapsed
  todayStats[domain].visits += 1

  // Reset timer after flush — dashboard reads activeStartTime to add live elapsed
  const now = Date.now()
  activeStart = now
  await chrome.storage.local.set({
    todayStats,
    statsDate: date,
    lastFlush: now,
    activeDomain: activeUrl,
    activeStartTime: now,
  })
}

// ─── Streak Engine ────────────────────────────────────────────────────────────
async function recalculateStreak() {
  const today = getTodayDate()
  const stored = await chrome.storage.local.get([
    'goalHistory', 'currentStreak', 'longestStreak', 'lastStreakDate'
  ])

  const goalHistory: Record<string, { completed: number; total: number; allMandatoryDone: boolean }> =
    (stored.goalHistory as Record<string, { completed: number; total: number; allMandatoryDone: boolean }>) || {}
  let currentStreak: number = (stored.currentStreak as number) || 0
  let longestStreak: number = (stored.longestStreak as number) || 0

  // Read goals from storage (synced from dashboard on each update)
  const goalsData = await chrome.storage.local.get('goals')
  const goals: any[] = (goalsData.goals as any[]) || []
  const todayGoals = goals.filter((g: any) => g.deadline === today)
  const mandatoryGoals = todayGoals.filter((g: any) => g.isMandatory)
  const mandatoryDone = mandatoryGoals.filter((g: any) => g.currentProgress >= g.target)
  const allMandatoryDone = mandatoryGoals.length > 0 && mandatoryDone.length === mandatoryGoals.length

  goalHistory[today] = {
    completed: todayGoals.filter((g: any) => g.currentProgress >= g.target).length,
    total: todayGoals.length,
    allMandatoryDone,
  }

  // Count consecutive days backwards
  let streak = 0
  const d = new Date()
  while (true) {
    const dateStr = d.toISOString().split('T')[0]
    const dayData = goalHistory[dateStr]
    if (!dayData || !dayData.allMandatoryDone) break
    streak++
    d.setDate(d.getDate() - 1)
  }

  currentStreak = streak
  longestStreak = Math.max(longestStreak, currentStreak)

  await chrome.storage.local.set({ goalHistory, currentStreak, longestStreak, lastStreakDate: today })

  // Streak-at-risk notification after 9 PM
  const hour = new Date().getHours()
  if (hour >= 21 && !allMandatoryDone && mandatoryGoals.length > 0) {
    const remaining = mandatoryGoals.length - mandatoryDone.length
    chrome.notifications.create('streak-at-risk', {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Streak at Risk!',
      message: `${remaining} mandatory goal${remaining > 1 ? 's' : ''} left today. Don't break your ${currentStreak}-day streak!`,
    })
  }

  return { currentStreak, longestStreak, allMandatoryDone }
}

// ─── Goal Reminder Alarms ─────────────────────────────────────────────────────
async function scheduleGoalReminders() {
  const goalsData = await chrome.storage.local.get('goals')
  const goals: any[] = (goalsData.goals as any[]) || []
  const today = getTodayDate()

  for (const g of goals) {
    if (g.reminderTime && g.deadline === today && g.currentProgress < g.target) {
      const [h, m] = g.reminderTime.split(':').map(Number)
      const reminderDate = new Date()
      reminderDate.setHours(h, m, 0, 0)
      if (reminderDate > new Date()) {
        chrome.alarms.create(`goal-reminder-${g.id}`, { when: reminderDate.getTime() })
      }
    }
  }
}

// ─── Alarms ───────────────────────────────────────────────────────────────────
chrome.alarms.create('flush-session', { periodInMinutes: 1 })
chrome.alarms.create('hourly-streak', { periodInMinutes: 60 })
chrome.alarms.create('daily-reset', { periodInMinutes: 60 })
chrome.alarms.create('schedule-reminders', { when: Date.now() + 2000 })

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'flush-session') {
    await flushActiveSession()
  }
  if (alarm.name === 'hourly-streak') {
    await recalculateStreak()
  }
  if (alarm.name === 'daily-reset') {
    const today = getTodayDate()
    const s = await chrome.storage.local.get('statsDate')
    if (s.statsDate !== today) {
      await chrome.storage.local.set({ todayStats: {}, statsDate: today })
      await scheduleGoalReminders()
    }
  }
  if (alarm.name === 'schedule-reminders') {
    await scheduleGoalReminders()
  }
  if (alarm.name.startsWith('goal-reminder-')) {
    const goalId = alarm.name.replace('goal-reminder-', '')
    const goalsData = await chrome.storage.local.get('goals')
    const goals: any[] = (goalsData.goals as any[]) || []
    const goal = goals.find((g: any) => g.id === goalId)
    if (goal && goal.currentProgress < goal.target) {
      chrome.notifications.create(`reminder-${goalId}`, {
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Goal Reminder',
        message: `Time to: "${goal.title}" — ${goal.currentProgress}/${goal.target}${goal.unit ? ' ' + goal.unit : ''}`,
      })
    }
  }
})

// ─── Message Listener ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_TODAY_STATS') {
    flushActiveSession().then(() => {
      chrome.storage.local.get('todayStats').then((res) => {
        sendResponse({ stats: res.todayStats || {} })
      })
    })
    return true
  }
  if (message.type === 'GET_ACTIVE_SITE') {
    sendResponse({
      domain: activeUrl,
      seconds: activeStart ? Math.floor((Date.now() - activeStart) / 1000) : 0,
    })
    return true
  }
  if (message.type === 'GOAL_UPDATED') {
    recalculateStreak().then((result) => sendResponse(result))
    return true
  }
  if (message.type === 'GET_STREAK') {
    chrome.storage.local.get(['currentStreak', 'longestStreak']).then((res) => {
      sendResponse({
        currentStreak: (res.currentStreak as number) || 0,
        longestStreak: (res.longestStreak as number) || 0,
      })
    })
    return true
  }
})

export {}

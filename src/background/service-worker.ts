// Background Service Worker for FocusOS
// Tracks active tabs and accumulates time per domain

import { categorizeDomain } from '../services/analytics'
import { getTodayDate, generateId } from '../services/analytics'

let activeTabId: number | null = null
let activeUrl: string | null = null
let activeStart: number | null = null

// Simple in-memory session accumulator (persisted on alarm)
const sessionData: Record<string, { seconds: number; visits: number; category: string }> = {}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  await flushActiveSession()
  const tab = await chrome.tabs.get(tabId)
  startTracking(tabId, tab.url || '')
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
  }
})

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await flushActiveSession()
    activeStart = null
  } else {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) startTracking(tab.id, tab.url || '')
  }
})

function startTracking(tabId: number, url: string) {
  try {
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return
    const domain = new URL(url).hostname.replace(/^www\./, '')
    activeTabId = tabId
    activeUrl = domain
    activeStart = Date.now()
  } catch { }
}

async function flushActiveSession() {
  if (!activeUrl || !activeStart) return
  const elapsed = Math.floor((Date.now() - activeStart) / 1000)
  if (elapsed < 2) return // ignore very short visits

  const domain = activeUrl
  const category = categorizeDomain(domain)

  if (!sessionData[domain]) {
    sessionData[domain] = { seconds: 0, visits: 0, category }
  }
  sessionData[domain].seconds += elapsed
  sessionData[domain].visits += 1

  // Persist to chrome.storage for popup access
  const date = getTodayDate()
  const stored = await chrome.storage.local.get('todayStats')
  const todayStats: Record<string, any> = stored.todayStats || {}
  if (!todayStats[domain]) todayStats[domain] = { seconds: 0, visits: 0, category, date }
  todayStats[domain].seconds += elapsed
  todayStats[domain].visits += 1

  await chrome.storage.local.set({ todayStats, lastFlush: Date.now() })
  activeStart = Date.now() // reset timer
}

// Periodic flush every minute
chrome.alarms.create('flush-session', { periodInMinutes: 1 })
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'flush-session') {
    await flushActiveSession()
  }
  // Reset daily stats at midnight
  if (alarm.name === 'daily-reset') {
    const today = getTodayDate()
    const stored = await chrome.storage.local.get('statsDate')
    if (stored.statsDate !== today) {
      await chrome.storage.local.set({ todayStats: {}, statsDate: today })
    }
  }
})

chrome.alarms.create('daily-reset', { periodInMinutes: 60 })

// Message listener for popup/dashboard queries
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
    sendResponse({ domain: activeUrl, seconds: activeStart ? Math.floor((Date.now() - activeStart) / 1000) : 0 })
  }
})

export { }




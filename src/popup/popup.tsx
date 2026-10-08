import React, { useEffect, useState } from 'react'
import { ExternalLink, Target, Clock, Zap } from 'lucide-react'
import { getAllGoals, getCompletionsByDate, getUserProfile } from '../services/storage'
import { getTodayDate, formatSeconds, getGreeting } from '../services/analytics'
import type { Goal, GoalCompletion, UserProfile } from '../types'

const TODAY = getTodayDate()

export default function Popup() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [completions, setCompletions] = useState<GoalCompletion[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [activeSite, setActiveSite] = useState<string>('—')
  const [todaySeconds, setTodaySeconds] = useState(0)

  useEffect(() => {
    Promise.all([
      getAllGoals(),
      getCompletionsByDate(TODAY),
      getUserProfile(),
    ]).then(([g, c, p]) => {
      setGoals(g.filter((x) => x.deadline === TODAY))
      setCompletions(c)
      setProfile(p)
    })

    try {
      chrome.runtime.sendMessage({ type: 'GET_ACTIVE_SITE' }, (res) => {
        if (res?.domain) setActiveSite(res.domain)
      })
      chrome.storage.local.get('todayStats', (res) => {
        if (res.todayStats) {
          const total = Object.values(res.todayStats as Record<string, { seconds: number }>)
            .reduce((sum, v) => sum + v.seconds, 0)
          setTodaySeconds(total)
        }
      })
    } catch {}
  }, [])

  const completed = completions.length
  const score = Math.round((completed / Math.max(goals.length, 1)) * 60 + (todaySeconds > 0 ? 20 : 0) + 20)

  const openDashboard = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') })
  }

  return (
    <div style={{
      width: 360, padding: 20, fontFamily: 'Nunito, sans-serif',
      background: 'var(--doodle-paper)',
      backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)',
      backgroundSize: '20px 20px',
    }}>
      <div style={{
        background: 'var(--c-yellow)', border: '2.5px solid var(--doodle-ink)',
        borderRadius: 14, padding: '14px 16px', marginBottom: 14,
        boxShadow: '3px 3px 0 var(--doodle-ink)',
      }}>
        <div style={{ fontFamily: 'Caveat, cursive', fontSize: 22, fontWeight: 700 }}>
          {getGreeting(profile?.name || 'Friend').split(',')[0]} 👋
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.65 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        {[
          { icon: <Target size={11} />, label: 'Goals', value: `${completed}/${goals.length}`, bg: 'white' },
          { icon: <Clock size={11} />, label: 'Time', value: formatSeconds(todaySeconds), bg: '#e8faff' },
          { icon: <Zap size={11} />, label: 'Score', value: `${score}`, bg: '#f5eeff' },
        ].map(({ icon, label, value, bg }) => (
          <div key={label} style={{
            flex: 1, background: bg, border: '2.5px solid var(--doodle-ink)',
            borderRadius: 12, padding: 12, boxShadow: '2px 2px 0 var(--doodle-ink)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.6, marginBottom: 4 }}>
              {icon} {label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{
        background: 'white', border: '2.5px solid var(--doodle-ink)',
        borderRadius: 12, padding: '10px 14px', marginBottom: 14,
        boxShadow: '2px 2px 0 var(--doodle-ink)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.6 }}>🌐 Currently on</div>
        <div style={{ fontWeight: 800, fontSize: 15, marginTop: 2 }}>{activeSite}</div>
      </div>

      {goals.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.6, marginBottom: 8 }}>TODAY'S GOALS</div>
          {goals.slice(0, 3).map((g) => {
            const done = completions.some((c) => c.goalId === g.id)
            return (
              <div key={g.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: done ? '#e6fff8' : 'white',
                border: '2px solid var(--doodle-ink)',
                borderRadius: 10, padding: '8px 12px', marginBottom: 6,
                boxShadow: '2px 2px 0 var(--doodle-ink)',
              }}>
                <span style={{ fontSize: 16 }}>{done ? '✅' : '⭕'}</span>
                <span style={{ fontWeight: 700, fontSize: 13, flex: 1, textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.6 : 1 }}>
                  {g.title}
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.5 }}>{g.targetMinutes}m</span>
              </div>
            )
          })}
        </div>
      )}

      <button
        onClick={openDashboard}
        style={{
          width: '100%', background: 'var(--doodle-ink)', color: 'white',
          border: '2.5px solid var(--doodle-ink)', borderRadius: 12,
          padding: '12px 16px', fontFamily: 'Nunito, sans-serif',
          fontWeight: 800, fontSize: 14, cursor: 'pointer',
          boxShadow: '3px 3px 0 var(--c-yellow)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <ExternalLink size={16} />
        Open Full Dashboard
      </button>
    </div>
  )
}

import { createRoot } from 'react-dom/client'
import '../index.css'
createRoot(document.getElementById('root')!).render(<Popup />)

import type { AIContext, AIInsight } from '../types'
import { generateId, getTodayDate } from './analytics'

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

const SYSTEM_PROMPT = `You are FocusOS AI — a personal productivity coach embedded in a Chrome extension.
You have access to structured data about the user's goals, browsing habits, and daily notes.
ALWAYS respond with:
1. 🔍 Observation — what you notice
2. 📊 Evidence — specific data backing it
3. 💡 Interpretation — why this might be happening
4. 🎯 Recommendation — one or two actionable steps
5. ⚡ Next Action (optional) — something concrete to do right now

Be concise, warm, and direct. Avoid generic advice. Base everything on the data provided.
Never make unsupported claims. If data is insufficient, say so clearly.`

function contextToPrompt(ctx: AIContext): string {
  const goalPct =
    ctx.goalsTotal > 0
      ? `${ctx.goalsCompleted}/${ctx.goalsTotal} (${Math.round((ctx.goalsCompleted / ctx.goalsTotal) * 100)}%)`
      : 'No goals set'

  const topSitesStr = ctx.topSites
    .map((s) => `  • ${s.domain} — ${s.minutes}m (${s.category})`)
    .join('\n')

  const trendStr = ctx.weeklyTrend
    ? ctx.weeklyTrend.map((d) => `  ${d.date}: score ${d.score}`).join('\n')
    : 'No weekly trend data'

  return `
USER DATA FOR ${ctx.date}:
Name: ${ctx.userName}
Goals completed: ${goalPct}
Productive time: ${ctx.productiveMinutes} minutes
Distracting time: ${ctx.distractingMinutes} minutes
Neutral time: ${ctx.neutralMinutes} minutes
Top sites visited:
${topSitesStr}
Daily notes: "${ctx.notes || 'None'}"
Weekly productivity trend:
${trendStr}
`
}

export async function generateDailyInsight(
  ctx: AIContext,
  apiKey: string,
  provider: 'openai' | 'gemini'
): Promise<AIInsight> {
  const userPrompt =
    contextToPrompt(ctx) +
    '\nAnalyze my productivity today and provide structured coaching feedback.'

  const content = await callAI(SYSTEM_PROMPT, userPrompt, [], apiKey, provider)

  return {
    id: generateId(),
    date: getTodayDate(),
    observation: extractSection(content, 'Observation') || content.slice(0, 200),
    evidence: extractSection(content, 'Evidence') || '',
    interpretation: extractSection(content, 'Interpretation') || '',
    recommendation: extractSection(content, 'Recommendation') || '',
    nextAction: extractSection(content, 'Next Action'),
    generatedAt: Date.now(),
  }
}

export async function chatWithAI(
  ctx: AIContext,
  messages: AIMessage[],
  apiKey: string,
  provider: 'openai' | 'gemini'
): Promise<string> {
  const systemWithContext = SYSTEM_PROMPT + '\n\n' + contextToPrompt(ctx)
  return callAI(systemWithContext, '', messages, apiKey, provider)
}

async function callAI(
  system: string,
  userPrompt: string,
  messages: AIMessage[],
  apiKey: string,
  provider: 'openai' | 'gemini'
): Promise<string> {
  if (provider === 'openai') {
    return callOpenAI(system, userPrompt, messages, apiKey)
  } else if (provider === 'gemini') {
    return callGemini(system, userPrompt, messages, apiKey)
  }
  throw new Error('No AI provider configured')
}

async function callOpenAI(
  system: string,
  userPrompt: string,
  messages: AIMessage[],
  apiKey: string
): Promise<string> {
  const allMessages = [
    { role: 'system', content: system },
    ...messages,
    ...(userPrompt ? [{ role: 'user', content: userPrompt }] : []),
  ]

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: allMessages,
      max_tokens: 600,
      temperature: 0.7,
    }),
  })

  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`)
  const data = await res.json()
  return data.choices[0].message.content
}

async function callGemini(
  system: string,
  userPrompt: string,
  messages: AIMessage[],
  apiKey: string
): Promise<string> {
  const contents = [
    ...(messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))),
    ...(userPrompt ? [{ role: 'user', parts: [{ text: userPrompt }] }] : []),
  ]

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { maxOutputTokens: 600, temperature: 0.7 },
      }),
    }
  )

  if (!res.ok) throw new Error(`Gemini error: ${res.status}`)
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.'
}

function extractSection(text: string, label: string): string | undefined {
  const regex = new RegExp(
    `(?:🔍|📊|💡|🎯|⚡)?\\s*${label}[:\\s]+([\\s\\S]+?)(?=(?:🔍|📊|💡|🎯|⚡)|$)`,
    'i'
  )
  const match = text.match(regex)
  return match?.[1]?.trim()
}

// ─── Mock AI (no API key) ─────────────────────────────────────────────────────

export function generateMockInsight(ctx: AIContext): AIInsight {
  const goalPct =
    ctx.goalsTotal > 0
      ? Math.round((ctx.goalsCompleted / ctx.goalsTotal) * 100)
      : 0
  const topDistraction = ctx.topSites
    .filter((s) => ['social', 'entertainment', 'distracting'].includes(s.category))
    .sort((a, b) => b.minutes - a.minutes)[0]

  return {
    id: generateId(),
    date: getTodayDate(),
    observation: `You completed ${ctx.goalsCompleted} of ${ctx.goalsTotal} goals today (${goalPct}%).`,
    evidence: `${ctx.productiveMinutes}m productive vs ${ctx.distractingMinutes}m distracting. ${
      topDistraction ? `Top distraction: ${topDistraction.domain} (${topDistraction.minutes}m)` : ''
    }`,
    interpretation:
      goalPct >= 75
        ? 'Great focus today! Your productive sessions are paying off.'
        : goalPct >= 50
          ? 'Decent progress, but some distraction pulled you off track.'
          : 'Low goal completion. Browsing patterns suggest scattered focus.',
    recommendation:
      goalPct < 75
        ? 'Try front-loading your hardest goal before noon tomorrow.'
        : 'Keep up the momentum — consider adding a stretch goal.',
    nextAction: topDistraction
      ? `Consider blocking ${topDistraction.domain} during focus hours tomorrow.`
      : undefined,
    generatedAt: Date.now(),
  }
}

export function generateMockChatResponse(question: string, ctx: AIContext): string {
  const q = question.toLowerCase()
  if (q.includes('unproductive') || q.includes('distract')) {
    const top = ctx.topSites.find((s) =>
      ['social', 'entertainment'].includes(s.category)
    )
    return `📊 Based on your data, you spent **${ctx.distractingMinutes}m** on distracting sites today.${top ? ` The biggest culprit was **${top.domain}** (${top.minutes}m).` : ''}\n\n💡 This often happens when energy is low — try scheduling focus blocks before 3 PM.`
  }
  if (q.includes('improv') || q.includes('better')) {
    return `📈 Your productive time today was **${ctx.productiveMinutes}m**. Goal completion: **${ctx.goalsCompleted}/${ctx.goalsTotal}**.\n\n🎯 Consistency beats perfection. Even completing 1 key goal daily compounds significantly over weeks.`
  }
  if (q.includes('tomorrow') || q.includes('plan')) {
    return `⚡ For tomorrow:\n1. Tackle your highest-priority goal first thing\n2. Limit entertainment to after 8 PM\n3. Write a quick note at day end to track mood\n\nThis builds the reflection loop that makes AI coaching meaningful.`
  }
  return `I can see your goals and browsing data for today. You've had **${ctx.productiveMinutes}m productive** and completed **${ctx.goalsCompleted}/${ctx.goalsTotal} goals**. Ask me anything specific about your productivity patterns!`
}

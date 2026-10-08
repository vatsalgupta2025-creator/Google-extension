import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Target,
  BookOpen,
  Globe,
  Brain,
  MessageSquare,
  Settings,
  LayoutDashboard,
  PenLine,
  CheckCircle2,
  Circle,
  Plus,
  Flame,
  Clock,
  Zap,
  TrendingUp,
  X,
  ChevronRight,
  Star,
  Trash2,
  RotateCcw,
  Download,
  Moon,
  Sun,
} from "lucide-react";
import type {
  Goal,
  GoalCompletion,
  DailyNote,
  WebsiteStats,
  DailyAnalytics,
  AIInsight,
  UserProfile,
  AppSettings,
  SiteCategory,
  Priority,
  GoalCategory,
  Mood,
  Difficulty,
} from "./types";
import {
  getAllGoals,
  saveGoal,
  deleteGoal,
  getDailyNote,
  saveDailyNote,
  getStatsByDate,
  getAnalyticsRange,
  saveCompletion,
  getCompletionsByDate,
  saveAIInsight,
  getAIInsightByDate,
  getUserProfile,
  saveUserProfile,
  getAppSettings,
  saveAppSettings,
  exportAllData,
  deleteAllData,
  getAllCategoryOverrides,
  saveCategoryOverride,
} from "./services/storage";
import {
  getTodayDate,
  getDateDaysAgo,
  formatSeconds,
  categorizeDomain,
  calcProductivityScore,
  getGreeting,
  generateId,
  buildAIContext,
  isProductiveCategory,
  isDistractingCategory,
} from "./services/analytics";
import {
  generateMockInsight,
  generateMockChatResponse,
  generateDailyInsight,
  chatWithAI,
} from "./services/ai";
import type { AIMessage } from "./services/ai";

// ─── helpers ─────────────────────────────────────────────────────────────────
const TODAY = getTodayDate();
const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: "var(--c-blue)",
  MEDIUM: "var(--c-yellow)",
  HIGH: "var(--c-orange)",
  URGENT: "var(--c-pink)",
};
const CAT_EMOJI: Record<GoalCategory, string> = {
  DSA: "🧩",
  Project: "🚀",
  Study: "📚",
  Work: "💼",
  Health: "🏃",
  Reading: "📖",
  Other: "✨",
};
const MOOD_MAP: Record<Mood, string> = {
  burned_out: "😫",
  meh: "😐",
  okay: "🙂",
  great: "😄",
  fire: "🔥",
};
const SITE_CAT_COLOR: Record<SiteCategory, string> = {
  productive: "var(--c-green)",
  education: "var(--c-blue)",
  coding: "var(--c-purple)",
  work: "var(--c-blue)",
  neutral: "var(--c-yellow)",
  search: "var(--c-yellow)",
  email: "var(--c-blue)",
  social: "var(--c-pink)",
  entertainment: "var(--c-orange)",
  distracting: "var(--c-red)",
  gaming: "var(--c-red)",
  custom: "var(--c-mint)",
};

// ─── Mock seed data for demo ──────────────────────────────────────────────────
function seedDemoData(): DailyAnalytics {
  return {
    date: TODAY,
    productiveSeconds: 13860, // 3h 51m
    distractingSeconds: 6660, // 1h 51m
    neutralSeconds: 2400,
    totalBrowserSeconds: 20520,
    goalsTotal: 3,
    goalsCompleted: 2,
    productivityScore: 78,
    topSites: [
      { domain: "youtube.com", seconds: 4800, category: "entertainment" },
      { domain: "github.com", seconds: 3120, category: "coding" },
      { domain: "chatgpt.com", seconds: 2460, category: "productive" },
      { domain: "instagram.com", seconds: 2280, category: "social" },
      { domain: "leetcode.com", seconds: 1980, category: "coding" },
    ],
  };
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color =
    score >= 75
      ? "var(--c-green)"
      : score >= 50
        ? "var(--c-yellow)"
        : "var(--c-orange)";
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--divider)"
          strokeWidth={8}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          style={{
            filter: "drop-shadow(0 0 4px rgba(0,0,0,0.2))",
            transition: "stroke-dasharray 0.8s ease",
          }}
        />
      </svg>
      <div
        className="score-label"
        style={{ fontSize: size < 70 ? 14 : 18, color }}
      >
        {score}
      </div>
    </div>
  );
}

// ─── Goal Card ────────────────────────────────────────────────────────────────
function GoalCard({
  goal,
  onComplete,
  onUpdate,
  onDelete,
}: {
  goal: Goal;
  onComplete: (g: Goal) => void;
  onUpdate: (g: Goal) => void;
  onDelete: (id: string) => void;
}) {
  const done = goal.currentProgress >= goal.target;

  const handleIncrement = (amount: number) => {
    if (done) return;
    const next = Math.min(goal.currentProgress + amount, goal.target);
    onUpdate({ ...goal, currentProgress: next });
    if (next >= goal.target) {
      onComplete({ ...goal, currentProgress: next });
    }
  };

  const handleDecrement = () => {
    if (goal.currentProgress <= 0) return;
    onUpdate({ ...goal, currentProgress: goal.currentProgress - 1 });
  };

  return (
    <div
      className="doodle-card animate-pop"
      style={{
        borderLeft: `5px solid ${goal.isMandatory ? "var(--c-orange)" : "var(--c-blue)"}`,
        opacity: done ? 0.75 : 1,
        position: "relative",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {goal.type === "binary" && (
            <button
              onClick={() => {
                if (!done) {
                  handleIncrement(1);
                }
              }}
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                border: "2px solid var(--border-color)",
                background: done ? "var(--c-green)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: done ? "default" : "pointer",
              }}
            >
              {done && <CheckCircle2 size={16} color="var(--ink)" />}
            </button>
          )}
          <div>
            <div
              className="font-bold"
              style={{
                fontSize: 16,
                textDecoration: done ? "line-through" : "none",
              }}
            >
              {goal.title}
            </div>
            <div className="flex gap-2 mt-2">
              <span
                className={`badge-doodle ${goal.isMandatory ? "badge-orange" : "badge-blue"}`}
              >
                {goal.isMandatory ? "Mandatory" : "Optional"}
              </span>
              {goal.reminderTime && (
                <span className="badge-doodle opacity-60">
                  ⏰ {goal.reminderTime}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-doodle btn-doodle-ghost btn-doodle-sm"
            onClick={() => onDelete(goal.id)}
            style={{ padding: "6px 8px" }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Numeric Progress Controls */}
      {goal.type === "numeric" && (
        <div
          className="mt-4 pt-3"
          style={{ borderTop: "2px dashed var(--divider)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold">
              Progress: {goal.currentProgress} / {goal.target} {goal.unit}
            </span>
            {done && <span className="badge-doodle badge-green">✓ Done</span>}
          </div>
          <div className="progress-doodle mb-3">
            <div
              className="progress-doodle-fill"
              style={{
                width: `${Math.min((goal.currentProgress / goal.target) * 100, 100)}%`,
              }}
            />
          </div>
          {!done && (
            <div className="flex gap-2">
              <button
                className="btn-doodle btn-doodle-sm btn-doodle-ghost"
                onClick={handleDecrement}
              >
                -1
              </button>
              <button
                className="btn-doodle btn-doodle-sm btn-doodle-blue"
                onClick={() => handleIncrement(1)}
              >
                +1
              </button>
              <button
                className="btn-doodle btn-doodle-sm btn-doodle-green"
                onClick={() => handleIncrement(5)}
              >
                +5
              </button>
              <button
                className="btn-doodle btn-doodle-sm btn-doodle-yellow"
                onClick={() => handleIncrement(10)}
              >
                +10
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add Goal Modal ───────────────────────────────────────────────────────────
function AddGoalModal({
  onSave,
  onClose,
}: {
  onSave: (g: Goal) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"binary" | "numeric">("binary");
  const [target, setTarget] = useState(1);
  const [unit, setUnit] = useState("");
  const [isMandatory, setIsMandatory] = useState(true);
  const [reminderTime, setReminderTime] = useState("");

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      id: generateId(),
      title: title.trim(),
      type,
      target: type === "binary" ? 1 : Math.max(1, target),
      unit: type === "numeric" ? unit.trim() : undefined,
      isMandatory,
      reminderTime: reminderTime || undefined,
      currentProgress: 0,
      deadline: TODAY,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "20px",
        zIndex: 100,
        overflowY: "auto"
      }}
    >
      <div
        className="doodle-card animate-pop"
        style={{ width: 460, maxWidth: "95vw", margin: "auto", flexShrink: 0 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="title-hand" style={{ fontSize: 26 }}>
            ✨ New Daymark Goal
          </h3>
          <button
            className="btn-doodle btn-doodle-ghost btn-doodle-sm"
            onClick={onClose}
          >
            <X size={14} />
          </button>
        </div>

        <label className="text-sm font-bold mb-1">Goal title *</label>
        <input
          className="input-doodle mb-3"
          placeholder="e.g. 50 Pushups"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="flex gap-3 mb-3">
          <div style={{ flex: 1 }}>
            <label className="text-sm font-bold mb-1">Type</label>
            <select
              className="input-doodle"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
            >
              <option value="binary">Binary (Done / Not Done)</option>
              <option value="numeric">Numeric (Tracker)</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="text-sm font-bold mb-1">
              Mandatory for Streak?
            </label>
            <select
              className="input-doodle"
              value={isMandatory ? "yes" : "no"}
              onChange={(e) => setIsMandatory(e.target.value === "yes")}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>

        {type === "numeric" && (
          <div className="flex gap-3 mb-3">
            <div style={{ flex: 1 }}>
              <label className="text-sm font-bold mb-1">Target</label>
              <input
                type="number"
                min={1}
                className="input-doodle"
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="text-sm font-bold mb-1">Unit</label>
              <input
                className="input-doodle"
                placeholder="e.g. pages, pushups"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>
        )}

        <label className="text-sm font-bold mb-1">
          Reminder Time (Optional)
        </label>
        <input
          type="time"
          className="input-doodle mb-4"
          value={reminderTime}
          onChange={(e) => setReminderTime(e.target.value)}
        />

        <button
          className="btn-doodle btn-doodle-purple w-full"
          onClick={handleSave}
        >
          <Plus size={16} /> Create Goal
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard Home ───────────────────────────────────────────────────────────
function DashboardHome({
  analytics,
  goals,
  completions,
  insight,
  profile,
  onRefreshInsight,
}: {
  analytics: DailyAnalytics;
  goals: Goal[];
  completions: GoalCompletion[];
  insight: AIInsight | null;
  profile: UserProfile | null;
  onRefreshInsight: () => void;
}) {
  const name = profile?.email ? profile.email.split('@')[0] : (profile?.name || 'Friend');
  const todayGoals = goals.filter((g) => g.deadline === TODAY);
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    try {
      chrome.storage.local.get('currentStreak', (res) => {
        setStreak((res.currentStreak as number) || 0);
      });
    } catch {}
    
    if (!insight) {
      onRefreshInsight();
    }
  }, [insight, onRefreshInsight]);

  const weekData = [
    { day: "Mon", prod: 210, dist: 70 },
    { day: "Tue", prod: 245, dist: 45 },
    { day: "Wed", prod: 180, dist: 90 },
    { day: "Thu", prod: 270, dist: 30 },
    { day: "Fri", prod: 231, dist: 60 },
    { day: "Sat", prod: 90, dist: 110 },
    {
      day: "Sun",
      prod: Math.round(analytics.productiveSeconds / 60),
      dist: Math.round(analytics.distractingSeconds / 60),
    },
  ];

  return (
    <div className="flex-col gap-4 animate-float">
      {/* Greeting */}
      <div
        className="doodle-card doodle-card-yellow"
        style={{ padding: "24px 28px" }}
      >
        <div className="title-hand" style={{ fontSize: 32 }}>
          {getGreeting(name)}
        </div>
        <div className="text-sm opacity-60 mt-1 mb-3">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </div>
        <div className="font-medium text-sm flex items-start gap-2" style={{ color: "#00d084", background: "rgba(0, 208, 132, 0.1)", padding: "10px 14px", borderRadius: "10px" }}>
          <span>✨</span>
          <span>
            {(() => {
              if (insight?.observation) {
                return insight.observation;
              }
              const goalsLeft = goals.filter((x) => x.deadline === TODAY).length - completions.length;
              if (goalsLeft > 0 && streak > 0) {
                return `You have ${goalsLeft} goal${goalsLeft > 1 ? 's' : ''} left. Complete them to protect your ${streak}-day streak!`;
              }
              if (goalsLeft > 0) {
                return `Let's tackle your goals today! You have ${goalsLeft} remaining.`;
              }
              if (analytics.productivityScore >= 80) {
                return `Incredible focus today! You've crushed your goals and your productivity is off the charts.`;
              }
              if (analytics.distractingSeconds > 3600) {
                return `Goals are done, but you've had a few distractions. Consider taking a real break instead of doomscrolling!`;
              }
              return `All goals completed! Great job protecting your ${streak}-day streak. Enjoy the rest of your day!`;
            })()}
          </span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex gap-4" style={{ flexWrap: "wrap" }}>
        {/* Score */}
        <div
          className="doodle-card"
          style={{ flex: "1 1 160px", textAlign: "center" }}
        >
          <div className="text-sm font-bold opacity-60 mb-2">
            🔥 Productivity
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 8,
            }}
          >
            <ScoreRing score={analytics.productivityScore} size={90} />
          </div>
          <div className="text-sm opacity-60">out of 100</div>
        </div>

        {/* Time */}
        <div
          className="doodle-card doodle-card-blue"
          style={{ flex: "1 1 160px" }}
        >
          <div className="text-sm font-bold opacity-60 mb-2">
            ⏱ Browser Time
          </div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            {formatSeconds(analytics.totalBrowserSeconds)}
          </div>
          <hr className="doodle-divider" />
          <div className="flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span>📚 Productive</span>
              <span className="font-bold" style={{ color: "var(--c-green)" }}>
                {formatSeconds(analytics.productiveSeconds)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>📱 Distracting</span>
              <span className="font-bold" style={{ color: "var(--c-red)" }}>
                {formatSeconds(analytics.distractingSeconds)}
              </span>
            </div>
          </div>
        </div>

        {/* Goals */}
        <div
          className="doodle-card doodle-card-green"
          style={{ flex: "1 1 160px" }}
        >
          <div className="text-sm font-bold opacity-60 mb-2">
            🎯 Today's Goals
          </div>
          <div style={{ fontSize: 32, fontWeight: 900 }}>
            {completions.length}/
            {Math.max(todayGoals.length, completions.length)}
          </div>
          <div className="progress-doodle mt-2">
            <div
              className="progress-doodle-fill"
              style={{
                width:
                  todayGoals.length > 0
                    ? `${(completions.length / todayGoals.length) * 100}%`
                    : completions.length > 0
                      ? "100%"
                      : "0%",
              }}
            />
          </div>
          <div className="text-sm opacity-60 mt-2">goals completed</div>
        </div>
      </div>

      {/* Top Sites */}
      <div className="doodle-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black" style={{ fontSize: 16 }}>
            🌐 Most Visited Today
          </h3>
        </div>
        <div className="flex-col gap-2">
          {analytics.topSites.map((site) => (
            <div key={site.domain} className="flex items-center gap-3">
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: SITE_CAT_COLOR[site.category],
                  border: "2px solid var(--ink)",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>
                {site.domain}
              </div>
              <div
                style={{
                  height: 8,
                  borderRadius: 4,
                  width: `${Math.max(20, (site.seconds / analytics.topSites[0].seconds) * 120)}px`,
                  background: SITE_CAT_COLOR[site.category],
                  border: "2px solid var(--ink)",
                }}
              />
              <div
                className="text-sm font-bold opacity-70"
                style={{ minWidth: 50, textAlign: "right" }}
              >
                {formatSeconds(site.seconds)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="doodle-card">
        <h3 className="font-black mb-3" style={{ fontSize: 16 }}>
          📊 Weekly Trend
        </h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weekData} barGap={2}>
            <XAxis
              dataKey="day"
              tick={{ fontFamily: "Nunito", fontWeight: 700, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                fontFamily: "Nunito",
                fontWeight: 700,
                borderRadius: 10,
                border: "2px solid #1a1a2e",
                boxShadow: "3px 3px 0 #1a1a2e",
              }}
              formatter={(v: any) => [`${v}m`, ""]}
            />
            <Bar
              dataKey="prod"
              name="Productive"
              fill="var(--c-green)"
              radius={[4, 4, 0, 0]}
              stroke="var(--ink)"
              strokeWidth={1.5}
            />
            <Bar
              dataKey="dist"
              name="Distracting"
              fill="var(--c-pink)"
              radius={[4, 4, 0, 0]}
              stroke="var(--ink)"
              strokeWidth={1.5}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-3 mt-2" style={{ justifyContent: "center" }}>
          <div className="flex items-center gap-1 text-xs font-bold">
            <div
              style={{
                width: 10,
                height: 10,
                background: "var(--c-green)",
                border: "1.5px solid var(--ink)",
                borderRadius: 2,
              }}
            />
            Productive
          </div>
          <div className="flex items-center gap-1 text-xs font-bold">
            <div
              style={{
                width: 10,
                height: 10,
                background: "var(--c-pink)",
                border: "1.5px solid var(--ink)",
                borderRadius: 2,
              }}
            />
            Distracting
          </div>
        </div>
      </div>

      {/* AI Insight */}
      <div className="doodle-card doodle-card-purple">
        <div className="flex items-center justify-between mb-3">
          <h3
            className="font-black flex items-center gap-2"
            style={{ fontSize: 16 }}
          >
            <Brain size={18} /> AI Insight
          </h3>
          <button
            className="btn-doodle btn-doodle-sm btn-doodle-ghost"
            onClick={onRefreshInsight}
          >
            <RotateCcw size={13} /> Refresh
          </button>
        </div>
        {insight ? (
          <div className="flex-col gap-2 text-sm">
            <p>
              <strong>🔍</strong> {insight.observation}
            </p>
            {insight.explanation && (
              <p>
                <strong>💡</strong> {insight.explanation}
              </p>
            )}
            <div
              style={{
                background: "white",
                border: "var(--border-doodle)",
                borderRadius: 10,
                padding: "10px 14px",
                marginTop: 4,
              }}
            >
              <p>
                <strong>🎯</strong> {insight.recommendation}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-sm opacity-60">
            Click Refresh to generate today's AI insight.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Goals Page ───────────────────────────────────────────────────────────────
function GoalsPage({
  goals,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
}: {
  goals: Goal[];
  onAddGoal: (g: Goal) => void;
  onUpdateGoal: (g: Goal) => void;
  onDeleteGoal: (id: string) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const todayGoals = goals.filter((g) => g.deadline === TODAY);
  const otherGoals = goals.filter((g) => g.deadline !== TODAY);

  return (
    <div className="flex-col gap-4 animate-float">
      <div className="flex items-center justify-between">
        <h2 className="title-hand" style={{ fontSize: 28 }}>
          🎯 Goals
        </h2>
        <button
          className="btn-doodle btn-doodle-purple"
          onClick={() => setShowAdd(true)}
        >
          <Plus size={16} /> Add Goal
        </button>
      </div>

      {todayGoals.length > 0 && (
        <>
          <div className="text-sm font-bold opacity-60">TODAY</div>
          {todayGoals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onComplete={onUpdateGoal}
              onUpdate={onUpdateGoal}
              onDelete={onDeleteGoal}
            />
          ))}
        </>
      )}

      {otherGoals.length > 0 && (
        <>
          <div className="text-sm font-bold opacity-60 mt-2">OTHER GOALS</div>
          {otherGoals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onComplete={onUpdateGoal}
              onUpdate={onUpdateGoal}
              onDelete={onDeleteGoal}
            />
          ))}
        </>
      )}

      {goals.length === 0 && (
        <div
          className="doodle-card doodle-card-yellow"
          style={{ textAlign: "center", padding: 40 }}
        >
          <div style={{ fontSize: 48 }}>🎯</div>
          <div className="title-hand mt-2">No goals yet!</div>
          <div className="text-sm opacity-60 mt-1">
            Add your first goal to start tracking.
          </div>
          <button
            className="btn-doodle btn-doodle-purple mt-4"
            onClick={() => setShowAdd(true)}
          >
            <Plus size={16} /> Create Goal
          </button>
        </div>
      )}

      {showAdd && (
        <AddGoalModal
          onSave={(g) => {
            onAddGoal(g);
            setShowAdd(false);
          }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

// ─── Analytics Page ───────────────────────────────────────────────────────────
function AnalyticsPage({ analytics, goals }: { analytics: DailyAnalytics; goals: Goal[] }) {
  const totalSecs = analytics.totalBrowserSeconds || 1;
  const [history, setHistory] = useState<{ date: string; completed: number; total: number; streak: number }[]>([]);

  useEffect(() => {
    // Build 7-day history from chrome.storage
    chrome.storage.local.get(['goalHistory', 'currentStreak', 'longestStreak'], (res) => {
      const hist = (res.goalHistory as Record<string, { completed: number; total: number }>) || {};
      const days: { date: string; completed: number; total: number; streak: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayData = hist[dateStr] || { completed: 0, total: 0 };
        days.push({ date: dateStr, completed: dayData.completed, total: dayData.total, streak: 0 });
      }
      setHistory(days);
    });
  }, []);

  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  useEffect(() => {
    chrome.storage.local.get(['currentStreak', 'longestStreak'], (res) => {
      setStreak({ current: (res.currentStreak as number) || 0, longest: (res.longestStreak as number) || 0 });
    });
  }, []);

  const pieData = [
    { name: "Productive", value: analytics.productiveSeconds, color: "var(--c-green)" },
    { name: "Distracting", value: analytics.distractingSeconds, color: "var(--c-pink)" },
    { name: "Neutral", value: analytics.neutralSeconds, color: "var(--c-yellow)" },
  ];

  const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  return (
    <div className="flex-col gap-4 animate-float">
      <h2 className="title-hand" style={{ fontSize: 28 }}>📊 Analytics</h2>

      {/* Streak Banner */}
      <div className="doodle-card" style={{ background: 'var(--card-orange)', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div className="text-sm font-bold opacity-60 mb-1">🔥 Current Streak</div>
          <div style={{ fontSize: 48, fontFamily: 'Caveat', fontWeight: 700, color: 'var(--c-orange)', lineHeight: 1 }}>
            {streak.current} <span style={{ fontSize: 22 }}>days</span>
          </div>
          <div className="text-sm opacity-50 mt-1">Keep going! Complete all mandatory goals daily.</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="text-sm font-bold opacity-60 mb-1">🏆 Best</div>
          <div style={{ fontSize: 36, fontFamily: 'Caveat', fontWeight: 700, color: 'var(--c-yellow)' }}>{streak.longest}</div>
        </div>
      </div>

      {/* 7-day Goal Completion Grid */}
      <div className="doodle-card">
        <h3 className="font-black mb-3">📅 7-Day Goal History</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {history.map((day, i) => {
            const label = dayLabels[new Date(day.date + 'T00:00:00').getDay() === 0 ? 6 : new Date(day.date + 'T00:00:00').getDay() - 1];
            const allDone = day.total > 0 && day.completed >= day.total;
            const partDone = day.completed > 0 && day.completed < day.total;
            const isToday = day.date === TODAY;
            return (
              <div key={day.date} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.5, marginBottom: 4 }}>{label}</div>
                <div style={{
                  width: '100%', aspectRatio: '1', borderRadius: 8,
                  background: allDone ? 'var(--c-green)' : partDone ? 'var(--c-yellow)' : day.total === 0 ? 'var(--divider)' : 'var(--c-red)',
                  border: isToday ? '2.5px solid var(--ink)' : '2px solid var(--border-color)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, boxShadow: isToday ? 'var(--shadow-sm)' : 'none',
                }}>
                  {allDone ? '✅' : partDone ? '🟡' : day.total === 0 ? '—' : '❌'}
                </div>
                <div style={{ fontSize: 9, fontWeight: 800, opacity: 0.5, marginTop: 3 }}>
                  {day.total > 0 ? `${day.completed}/${day.total}` : ''}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 mt-3" style={{ flexWrap: 'wrap', fontSize: 11 }}>
          {[['✅', 'All done', 'var(--c-green)'], ['🟡', 'Partial', 'var(--c-yellow)'], ['❌', 'Missed', 'var(--c-red)'], ['—', 'No goals', 'var(--divider)']].map(([icon, lbl, bg]) => (
            <span key={lbl} className="flex items-center gap-1" style={{ opacity: 0.7 }}>
              <span style={{ background: bg as string, borderRadius: 4, width: 12, height: 12, display: 'inline-block' }} />
              {icon} {lbl}
            </span>
          ))}
        </div>
      </div>

      {/* Time breakdown */}
      <div className="doodle-card">
        <h3 className="font-black mb-3">Today's Breakdown</h3>
        {pieData.map((d) => (
          <div key={d.name} className="mb-2">
            <div className="flex items-center justify-between text-sm font-bold mb-1">
              <span>{d.name}</span>
              <span>{formatSeconds(d.value)}</span>
            </div>
            <div className="progress-doodle">
              <div className="progress-doodle-fill" style={{ width: `${(d.value / totalSecs) * 100}%`, background: d.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Site table */}
      <div className="doodle-card">
        <h3 className="font-black mb-3">🌐 Time per Website</h3>
        <div className="flex-col gap-2">
          {analytics.topSites.map((s, i) => (
            <div key={s.domain} className="doodle-card" style={{ padding: "12px 16px", marginBottom: 0 }}>
              <div className="flex items-center gap-3">
                <div style={{ position: "relative", width: 32, height: 32, flexShrink: 0 }}>
                  <img
                    src={`https://www.google.com/s2/favicons?sz=32&domain=${s.domain}`}
                    alt={s.domain}
                    width={32}
                    height={32}
                    style={{ borderRadius: 6, border: "1.5px solid var(--border-color)", background: "var(--card-bg)" }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                      (e.currentTarget.nextSibling as HTMLElement).style.display = "flex";
                    }}
                  />
                  <div style={{
                    display: "none", position: "absolute", inset: 0, borderRadius: 6,
                    background: "var(--c-purple)", color: "white",
                    alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 900,
                  }}>
                    {s.domain[0]?.toUpperCase()}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="font-bold">{s.domain}</div>
                  <div className="flex gap-2 mt-1">
                    <span className="badge-doodle" style={{ background: SITE_CAT_COLOR[s.category] }}>{s.category}</span>
                    <span style={{ fontSize: 11, opacity: 0.5, fontWeight: 700 }}>#{i + 1}</span>
                  </div>
                </div>
                <div className="font-black" style={{ fontSize: 18 }}>{formatSeconds(s.seconds)}</div>
              </div>
            </div>
          ))}
          {analytics.topSites.length === 0 && (
            <div className="text-sm opacity-50 text-center" style={{ padding: 20 }}>
              📭 No browsing data yet — start browsing to see stats here.
            </div>
          )}
        </div>
      </div>

      {/* Productivity score detail */}
      <div className="doodle-card doodle-card-yellow">
        <h3 className="font-black mb-3">🔥 Score Breakdown</h3>
        <div className="flex items-center gap-4">
          <ScoreRing score={analytics.productivityScore} size={100} />
          <div className="flex-col gap-2 text-sm">
            <div><span className="font-bold">Goals:</span>{" "}{analytics.goalsCompleted}/{analytics.goalsTotal} completed</div>
            <div><span className="font-bold">Productive ratio:</span>{" "}{Math.round((analytics.productiveSeconds / totalSecs) * 100)}%</div>
            <div><span className="font-bold">Distraction ratio:</span>{" "}{Math.round((analytics.distractingSeconds / totalSecs) * 100)}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Notes Page ───────────────────────────────────────────────────────────────
function NotesPage() {
  const [note, setNote] = useState<DailyNote>({
    id: generateId(),
    date: TODAY,
    accomplished: "",
    wentWrong: "",
    improve: "",
    freeNote: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getDailyNote(TODAY).then((n) => {
      if (n) setNote(n);
    });
  }, []);

  const handleSave = async () => {
    const updated = { ...note, updatedAt: Date.now() };
    await saveDailyNote(updated);
    setNote(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-col gap-4 animate-float">
      <h2 className="title-hand" style={{ fontSize: 28 }}>
        📝 Daily Reflection
      </h2>
      <div className="doodle-card doodle-card-mint">
        <p className="text-sm opacity-60 mb-0">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {[
        {
          label: "✅ What did you accomplish?",
          key: "accomplished",
          placeholder: "I finished the binary search chapter...",
        },
        {
          label: "❌ What went wrong?",
          key: "wentWrong",
          placeholder: "I got distracted by YouTube after 8 PM...",
        },
        {
          label: "🚀 What should you improve tomorrow?",
          key: "improve",
          placeholder: "Start coding before checking social media...",
        },
        {
          label: "💭 Free notes",
          key: "freeNote",
          placeholder: "Anything else on your mind...",
        },
      ].map(({ label, key, placeholder }) => (
        <div key={key} className="doodle-card">
          <label className="font-bold mb-2" style={{ fontSize: 14 }}>
            {label}
          </label>
          <textarea
            className="input-doodle mt-2"
            placeholder={placeholder}
            value={(note as any)[key] || ""}
            onChange={(e) => setNote((n) => ({ ...n, [key]: e.target.value }))}
            style={{ minHeight: 80 }}
          />
        </div>
      ))}

      <button
        className="btn-doodle btn-doodle-green"
        onClick={handleSave}
        style={{ width: "100%" }}
      >
        {saved ? "✓ Saved!" : "💾 Save Reflection"}
      </button>
    </div>
  );
}

// ─── AI Chat Page ─────────────────────────────────────────────────────────────
function AIChatPage({
  analytics,
  profile,
  settings,
}: {
  analytics: DailyAnalytics;
  profile: UserProfile | null;
  settings: AppSettings;
}) {
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; text: string }[]
  >([
    {
      role: "ai",
      text: `👋 Hey ${profile?.name || "there"}! I'm your Daymark AI coach. I have access to your goals, browsing data, and notes today. Ask me anything!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  const ctx = buildAIContext(analytics, "", profile?.name || "User");

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const bundledKey = import.meta.env.VITE_GEMINI_API_KEY;
      const apiKeyToUse = profile?.aiApiKey || bundledKey;
      const providerToUse = (profile?.aiApiKey && profile.aiProvider !== "none") ? profile.aiProvider : (bundledKey ? "gemini" : "none");

      let reply = "";
      if (
        settings.aiEnabled &&
        apiKeyToUse &&
        providerToUse !== "none"
      ) {
        const history: AIMessage[] = messages
          .filter((m) => m.role !== "ai" || messages.indexOf(m) > 0)
          .map((m) => ({
            role: m.role === "ai" ? "assistant" : "user",
            content: m.text,
          }));
        reply = await chatWithAI(
          ctx,
          history,
          apiKeyToUse,
          providerToUse as "openai" | "gemini",
        );
      } else {
        await new Promise((r) => setTimeout(r, 800));
        reply = generateMockChatResponse(userMsg, ctx);
      }
      setMessages((m) => [...m, { role: "ai", text: reply }]);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error('[Daymark AI]', e);
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          text: `⚠️ AI error: ${errMsg}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const suggested = [
    "Why was I unproductive today?",
    "What should I focus on tomorrow?",
    "Compare my productive vs distracting time",
    "Give me a plan for tomorrow",
  ];

  return (
    <div className="flex-col" style={{ height: "100%", gap: 16 }}>
      <h2 className="title-hand" style={{ fontSize: 28 }}>
        🧠 AI Coach
      </h2>
      <div
        className="doodle-card"
        style={{
          flex: 1,
          overflowY: "auto",
          minHeight: 300,
          maxHeight: 420,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: "16px",
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className="animate-float"
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "80%",
            }}
          >
            <div
              style={{
                background: m.role === "user" ? "var(--ink)" : "var(--input-bg)",
                color: m.role === "user" ? "var(--paper)" : "var(--text-primary)",
                border: "var(--border-doodle)",
                borderRadius:
                  m.role === "user"
                    ? "16px 16px 4px 16px"
                    : "16px 16px 16px 4px",
                padding: "10px 14px",
                boxShadow: "var(--shadow-doodle)",
                fontSize: 14,
                fontWeight: 600,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: "flex-start" }}>
            <div
              style={{
                background: "white",
                border: "var(--border-doodle)",
                borderRadius: "16px 16px 16px 4px",
                padding: "10px 16px",
                boxShadow: "var(--shadow-doodle)",
              }}
            >
              <span style={{ fontFamily: "Caveat", fontSize: 18 }}>
                Thinking...
              </span>{" "}
              🤔
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Suggested questions */}
      <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
        {suggested.map((q) => (
          <button
            key={q}
            className="btn-doodle btn-doodle-sm btn-doodle-ghost"
            onClick={() => {
              setInput(q);
            }}
          >
            {q}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="input-doodle"
          placeholder="Ask anything about your productivity..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          style={{ flex: 1 }}
        />
        <button
          className="btn-doodle btn-doodle-purple"
          onClick={send}
          disabled={loading || !input.trim()}
        >
          <Zap size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────
function SettingsPage({
  profile,
  setProfile,
  settings,
  setSettings,
}: {
  profile: UserProfile | null;
  setProfile: (p: UserProfile) => void;
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
}) {
  const [name, setName] = useState(profile?.name || "");
  const [apiKey, setApiKey] = useState(profile?.aiApiKey || "");
  const [provider, setProvider] = useState<"openai" | "gemini" | "none">(
    profile?.aiProvider || "none",
  );
  const [dailyTarget, setDailyTarget] = useState(
    profile?.dailyTargetHours || 6,
  );
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);

  const save = async () => {
    const p: UserProfile = {
      name: name.trim() || "Friend",
      currentFocus: profile?.currentFocus || [],
      learningGoals: profile?.learningGoals || [],
      preferredStudyTime: profile?.preferredStudyTime || "morning",
      dailyTargetHours: dailyTarget,
      priorities: profile?.priorities || [],
      aiApiKey: apiKey.trim() || undefined,
      aiProvider: provider,
      updatedAt: Date.now(),
    };
    await saveUserProfile(p);
    setProfile(p);
    await saveAppSettings({ ...settings, updatedAt: Date.now() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const exportData = async () => {
    setExporting(true);
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Daymark-export-${TODAY}.json`;
    a.click();
    setExporting(false);
  };

  const clearData = async () => {
    if (confirm("Delete ALL Daymark data? This cannot be undone.")) {
      await deleteAllData();
      alert("Data cleared!");
    }
  };

  return (
    <div className="flex-col gap-4 animate-float">
      <h2 className="title-hand" style={{ fontSize: 28 }}>
        ⚙️ Settings
      </h2>

      {/* Profile */}
      <div className="doodle-card">
        <h3 className="font-black mb-3">👤 Profile</h3>
        <label className="text-sm font-bold">Your name</label>
        <input
          className="input-doodle mt-1 mb-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Vatsal"
        />
        <label className="text-sm font-bold">Daily target (hours)</label>
        <input
          type="number"
          min={1}
          max={16}
          className="input-doodle mt-1"
          value={dailyTarget}
          onChange={(e) => setDailyTarget(Number(e.target.value))}
        />
      </div>

      {/* Theme */}
      <div className="doodle-card doodle-card-blue">
        <h3 className="font-black mb-3">🎨 Appearance</h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold">Dark Mode</span>
          <button
            className={`btn-doodle btn-doodle-sm ${settings.theme === "dark" ? "btn-doodle-purple" : "btn-doodle-ghost"}`}
            onClick={() => {
              const newTheme = settings.theme === "dark" ? "light" : "dark";
              setSettings({
                ...settings,
                theme: newTheme as any,
                updatedAt: Date.now(),
              });
              document.body.setAttribute("data-theme", newTheme);
            }}
          >
            {settings.theme === "dark" ? <Moon size={14} /> : <Sun size={14} />}{" "}
            {settings.theme === "dark" ? "Dark" : "Light"}
          </button>
        </div>
      </div>

      {/* AI */}
      <div className="doodle-card doodle-card-purple">
        <h3 className="font-black mb-3">🧠 AI Configuration</h3>
        <label className="text-sm font-bold">AI Provider</label>
        <select
          className="input-doodle mt-1 mb-3"
          value={provider}
          onChange={(e) => setProvider(e.target.value as any)}
        >
          <option value="none">None (use mock AI)</option>
          <option value="openai">OpenAI (GPT-4o mini)</option>
          <option value="gemini">Google Gemini Flash</option>
        </select>
        {provider !== "none" && (
          <>
            <label className="text-sm font-bold">API Key</label>
            <input
              type="password"
              className="input-doodle mt-1 mb-2"
              placeholder="sk-... or AIza..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs opacity-60">
              🔒 Stored locally only. Never sent anywhere except the AI API.
            </p>
          </>
        )}
      </div>

      {/* Tracking */}
      <div className="doodle-card">
        <h3 className="font-black mb-3">📡 Tracking</h3>
        {[
          { label: "Enable tracking", key: "trackingEnabled" },
          { label: "Track browsing activity", key: "trackBrowsing" },
          { label: "Track time", key: "trackTime" },
          { label: "Enable AI features", key: "aiEnabled" },
        ].map(({ label, key }) => (
          <div key={key} className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold">{label}</span>
            <button
              className={`btn-doodle btn-doodle-sm ${(settings as any)[key] ? "btn-doodle-green" : "btn-doodle-ghost"}`}
              onClick={() =>
                setSettings({
                  ...settings,
                  [key]: !(settings as any)[key],
                  updatedAt: Date.now(),
                })
              }
            >
              {(settings as any)[key] ? "✓ On" : "Off"}
            </button>
          </div>
        ))}
      </div>

      {/* Privacy */}
      <div className="doodle-card doodle-card-orange">
        <h3 className="font-black mb-3">🔒 Privacy & Data</h3>
        <div className="flex gap-2">
          <button
            className="btn-doodle btn-doodle-blue"
            onClick={exportData}
            disabled={exporting}
          >
            <Download size={14} /> {exporting ? "Exporting..." : "Export Data"}
          </button>
          <button className="btn-doodle btn-doodle-pink" onClick={clearData}>
            <Trash2 size={14} /> Clear All Data
          </button>
        </div>
      </div>

      <button className="btn-doodle btn-doodle-green" onClick={save}>
        {saved ? "✓ Saved!" : "💾 Save Settings"}
      </button>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
type Page = "home" | "goals" | "analytics" | "notes" | "ai" | "settings";
const NAV: {
  id: Page;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    id: "home",
    label: "Dashboard",
    icon: <LayoutDashboard size={18} />,
    color: "var(--c-yellow)",
  },
  {
    id: "goals",
    label: "Goals",
    icon: <Target size={18} />,
    color: "var(--c-green)",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: <TrendingUp size={18} />,
    color: "var(--c-blue)",
  },
  {
    id: "notes",
    label: "Reflection",
    icon: <PenLine size={18} />,
    color: "var(--c-mint)",
  },
  {
    id: "ai",
    label: "AI Coach",
    icon: <Brain size={18} />,
    color: "var(--c-purple)",
  },
  {
    id: "settings",
    label: "Settings",
    icon: <Settings size={18} />,
    color: "var(--c-orange)",
  },
];

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [completions, setCompletions] = useState<GoalCompletion[]>([]);
  const [analytics, setAnalytics] = useState<DailyAnalytics>(seedDemoData());
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [completeTarget, setCompleteTarget] = useState<Goal | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.body.setAttribute("data-theme", next);
    if (settings) {
      const s = { ...settings, theme: next as any, updatedAt: Date.now() };
      setSettings(s);
      import("./services/storage").then((m) => m.saveAppSettings(s));
    }
  };

  // Load data on mount
  useEffect(() => {
    Promise.all([
      getAllGoals(),
      getCompletionsByDate(TODAY),
      getAIInsightByDate(TODAY),
      getUserProfile(),
      getAppSettings(),
    ]).then(([g, c, ai, p, s]) => {
      setGoals(g);
      setCompletions(c);
      if (ai) setInsight(ai);
      setProfile(p);
      setSettings(s);
      const savedTheme = (s?.theme as any) === "dark" ? "dark" : "light";
      setTheme(savedTheme);
      document.body.setAttribute("data-theme", savedTheme);

      if (chrome?.identity?.getProfileUserInfo) {
        chrome.identity.getProfileUserInfo({ accountStatus: "ANY" }, (info) => {
          if (info.email) {
            const defaultName = info.email.split("@")[0];
            setProfile((prev) => {
              const current = prev || {
                name: defaultName,
                email: info.email,
                currentFocus: [],
                learningGoals: [],
                preferredStudyTime: "morning",
                dailyTargetHours: 4,
                priorities: [],
                aiProvider: "none",
                updatedAt: Date.now(),
              };
              if (current.email !== info.email || current.name === "Friend" || !current.name) {
                const updated = {
                  ...current,
                  email: info.email,
                  name: current.name === "Friend" || !current.name ? defaultName : current.name,
                };
                import("./services/storage").then((m) => m.saveUserProfile(updated));
                return updated;
              }
              return current;
            });
          }
        });
      }

      // Fetch real-time stats — includes currently-running tab session
      const fetchLiveStats = () => {
        try {
          chrome.storage.local.get(
            ['todayStats', 'statsDate', 'activeDomain', 'activeStartTime'],
            (res) => {
              const today = new Date().toISOString().split('T')[0];
              if (res.statsDate && res.statsDate !== today) return;

              const rawStats: Record<string, any> = res.todayStats || {};

              // Add the LIVE running session that hasn't been flushed yet
              // activeStartTime is reset on every flush, so Date.now() - activeStartTime = seconds since last flush
              const activeDomain: string = (res.activeDomain as string) || '';
              const activeStartTime: number = (res.activeStartTime as number) || 0;
              const liveElapsed = activeDomain && activeStartTime > 0
                ? Math.floor((Date.now() - activeStartTime) / 1000)
                : 0;

              // Clone so we don't mutate stored object
              const stats = { ...rawStats };
              if (activeDomain && liveElapsed > 0) {
                if (stats[activeDomain]) {
                  stats[activeDomain] = {
                    ...stats[activeDomain],
                    seconds: (stats[activeDomain].seconds || 0) + liveElapsed,
                  };
                } else {
                  // Domain not seen yet — categorize it
                  import('./services/analytics').then(({ categorizeDomain }) => {
                    // Re-trigger after import (will pick up on next poll)
                  });
                }
              }

              let prod = 0, dist = 0, neu = 0;
              const sites: any[] = [];
              for (const [domain, stat] of Object.entries(stats) as any) {
                const cat = stat.category;
                if (cat === 'productive' || cat === 'coding' || cat === 'education' || cat === 'work')
                  prod += stat.seconds;
                else if (cat === 'distracting' || cat === 'social' || cat === 'entertainment' || cat === 'gaming')
                  dist += stat.seconds;
                else neu += stat.seconds;
                sites.push({ domain, seconds: stat.seconds, category: cat });
              }
              sites.sort((a, b) => b.seconds - a.seconds);
              const total = prod + dist + neu;
              const todayGoals = g.filter((x) => x.deadline === TODAY).length;

              setAnalytics({
                date: TODAY,
                productiveSeconds: prod,
                distractingSeconds: dist,
                neutralSeconds: neu,
                totalBrowserSeconds: total,
                goalsTotal: todayGoals,
                goalsCompleted: c.length,
                productivityScore: Math.min(100, Math.round(
                  (c.length / Math.max(todayGoals, 1)) * 50 +
                  (total > 0 ? Math.min(30, (prod / Math.max(total, 1)) * 30) : 0) +
                  20,
                )),
                topSites: sites.slice(0, 8),
              });

              // Also enrich with Chrome history for today
              if (chrome.history) {
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);
                chrome.history.search(
                  { text: '', startTime: startOfDay.getTime(), maxResults: 500 },
                  (histItems) => {
                    // Count visits per domain from history
                    const visitCounts: Record<string, number> = {};
                    histItems.forEach((item) => {
                      try {
                        const domain = new URL(item.url || '').hostname.replace(/^www\./, '');
                        if (domain) visitCounts[domain] = (visitCounts[domain] || 0) + (item.visitCount || 1);
                      } catch {}
                    });
                    // Merge visit counts into stored stats via storage message
                    chrome.storage.local.get(['todayStats'], (stored2) => {
                      const merged: Record<string, any> = { ...(stored2.todayStats as Record<string, any> || {}) };
                      for (const [domain, visits] of Object.entries(visitCounts)) {
                        if (merged[domain]) {
                          merged[domain].visits = Math.max(merged[domain].visits || 0, visits);
                        }
                      }
                    });
                  }
                );
              }
            }
          );
        } catch {}
      };

      fetchLiveStats();
      // Poll every 3 seconds for near-real-time updates
      const interval = setInterval(fetchLiveStats, 3000);
      return () => clearInterval(interval);
    });
  }, []);

  const handleAddGoal = useCallback(async (g: Goal) => {
    await saveGoal(g);
    setGoals((prev) => {
      const updated = [...prev, g];
      try { chrome.storage.local.set({ goals: updated }); } catch {}
      try { chrome.runtime.sendMessage({ type: 'GOAL_UPDATED' }); } catch {}
      return updated;
    });
  }, []);

  const handleDeleteGoal = useCallback(async (id: string) => {
    await deleteGoal(id);
    setGoals((prev) => {
      const updated = prev.filter((g) => g.id !== id);
      try { chrome.storage.local.set({ goals: updated }); } catch {}
      try { chrome.runtime.sendMessage({ type: 'GOAL_UPDATED' }); } catch {}
      return updated;
    });
  }, []);

  const handleUpdateGoal = useCallback(async (g: Goal) => {
    await saveGoal(g);
    setGoals((prev) => {
      const updated = prev.map((old) => (old.id === g.id ? g : old));
      // Sync full goals list to chrome.storage so background worker can read them
      try { chrome.storage.local.set({ goals: updated }); } catch {}
      return updated;
    });

    // If the goal was just completed
    if (g.currentProgress >= g.target) {
      const completion: GoalCompletion = {
        id: generateId(),
        goalId: g.id,
        date: TODAY,
        completedAt: Date.now(),
      };
      await saveCompletion(completion);
      setCompletions((prev) => [...prev, completion]);

      setAnalytics((a) => ({
        ...a,
        goalsCompleted: a.goalsCompleted + 1,
        productivityScore: Math.min(100, a.productivityScore + 5),
      }));
    }

    // Trigger background streak recalculation
    try { chrome.runtime.sendMessage({ type: 'GOAL_UPDATED' }); } catch {}
  }, []);

  const handleRefreshInsight = useCallback(async () => {
    const ctx = buildAIContext(analytics, "", profile?.name || "User");
    let ins: AIInsight;
    
    const bundledKey = import.meta.env.VITE_GEMINI_API_KEY;
    const userKey = profile?.aiApiKey;
    const apiKeyToUse = userKey || bundledKey;
    const providerToUse = userKey && profile?.aiProvider !== "none" ? profile.aiProvider : (bundledKey ? "gemini" : "none");

    if (settings?.aiEnabled && apiKeyToUse && providerToUse !== "none") {
      try {
        ins = await generateDailyInsight(
          ctx,
          apiKeyToUse,
          providerToUse as "openai" | "gemini",
        );
      } catch {
        ins = generateMockInsight(ctx);
      }
    } else {
      ins = generateMockInsight(ctx);
    }
    await saveAIInsight(ins);
    setInsight(ins);
  }, [analytics, profile, settings]);

  const activeNav = NAV.find((n) => n.id === page)!;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Floating theme toggle */}
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        title="Toggle dark mode"
      >
        {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        {theme === "dark" ? "Light" : "Dark"}
      </button>

      {/* Sidebar */}
      <div
        className="sidebar-inner"
        style={{
          width: sidebarOpen ? 220 : 64,
          borderRight: "2.5px solid var(--border-color)",
          background: "var(--sidebar-bg)",
          display: "flex",
          flexDirection: "column",
          padding: "20px 12px",
          gap: 6,
          transition: "width 0.25s ease, background 0.3s ease",
          boxShadow: "3px 0 0 var(--border-color)",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2 mb-4"
          style={{ cursor: "pointer", paddingLeft: 4 }}
          onClick={() => setSidebarOpen((v) => !v)}
        >
          <div
            style={{
              width: 38,
              height: 38,
              background: "var(--ink)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--c-yellow)",
              fontSize: 20,
              flexShrink: 0,
              border: "2px solid var(--ink)",
              boxShadow: "2px 2px 0 var(--c-yellow)",
            }}
          >
            🎯
          </div>
          {sidebarOpen && (
            <span
              style={{
                fontFamily: "Caveat",
                fontWeight: 700,
                fontSize: 22,
                whiteSpace: "nowrap",
              }}
            >
              Daymark
            </span>
          )}
        </div>

        {NAV.map((n) => (
          <div
            key={n.id}
            className={`nav-item ${page === n.id ? "active" : ""}`}
            onClick={() => setPage(n.id)}
            title={n.label}
          >
            <div style={{ flexShrink: 0 }}>{n.icon}</div>
            {sidebarOpen && (
              <span style={{ whiteSpace: "nowrap" }}>{n.label}</span>
            )}
          </div>
        ))}

        <div style={{ flex: 1 }} />
        {sidebarOpen && profile && (
          <div
            style={{
              padding: "8px 4px",
              fontSize: 12,
              fontWeight: 700,
              opacity: 0.5,
              whiteSpace: "nowrap",
            }}
          >
            👤 {profile.name}
          </div>
        )}
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "28px 32px",
          display: "flex",
          flexDirection: "column",
          background: "var(--paper)",
          transition: "background 0.3s ease",
        }}
      >
        {page === "home" && (
          <DashboardHome
            analytics={analytics}
            goals={goals}
            completions={completions}
            insight={insight}
            profile={profile}
            onRefreshInsight={handleRefreshInsight}
          />
        )}
        {page === "goals" && (
          <GoalsPage
            goals={goals}
            onAddGoal={handleAddGoal}
            onUpdateGoal={handleUpdateGoal}
            onDeleteGoal={handleDeleteGoal}
          />
        )}
        {page === "analytics" && <AnalyticsPage analytics={analytics} goals={goals} />}
        {page === "notes" && <NotesPage />}
        {page === "ai" && settings && (
          <AIChatPage
            analytics={analytics}
            profile={profile}
            settings={settings}
          />
        )}
        {page === "settings" && settings && (
          <SettingsPage
            profile={profile}
            setProfile={(p) => {
              setProfile(p);
              saveUserProfile(p);
            }}
            settings={settings}
            setSettings={(s) => {
              setSettings(s);
              saveAppSettings(s);
            }}
          />
        )}
      </div>
    </div>
  );
}

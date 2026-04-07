import { useState, useRef, useLayoutEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getChildSummary } from '../api/dashboard'
import CommentThread from './CommentThread'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatRecurrence(frequency, day_of_week, day_of_month) {
  if (!frequency) return null
  const label = frequency.charAt(0).toUpperCase() + frequency.slice(1)
  if (frequency === 'weekly' && day_of_week != null) return `${label} (${DAY_NAMES[day_of_week]})`
  if (frequency === 'monthly' && day_of_month != null) {
    const suffix = day_of_month === 1 || day_of_month === 21 ? 'st'
      : day_of_month === 2 || day_of_month === 22 ? 'nd'
      : day_of_month === 3 || day_of_month === 23 ? 'rd' : 'th'
    return `${label} (${day_of_month}${suffix})`
  }
  return label
}

const STATUS_LABELS = {
  assigned: 'Ready to start',
  in_progress: 'In progress',
  paused: 'Paused',
  parent_paused: 'Paused by parent',
  submitted: 'Waiting for review',
  rejected: 'Rejected'
}

function EmptyCard() {
  return (
    <div className="flex-1 flex items-center justify-center rounded-xl" style={{ background: 'linear-gradient(to bottom left, rgba(20,184,166,0.15), rgba(255,255,255,0.08), rgba(168,85,247,0.15))' }}>
      <div className="flex flex-col items-center gap-4 h-[80%] justify-center">
        <div className="text-xl text-amber-400 uppercase tracking-widest font-bold">ALL CAUGHT UP</div>
        <span className="text-[8rem] leading-none animate-spin-slow">⭐</span>
        <div className="text-xl text-amber-400 uppercase tracking-widest font-bold">GREAT WORK</div>
      </div>
    </div>
  )
}

function ScrollFade({ children, className }) {
  const ref = useRef(null)
  const [overflows, setOverflows] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [children])

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={ref} className={className}>{children}</div>
      {overflows && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-900 to-transparent" />
      )}
    </div>
  )
}

export default function ChildDashboardTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'child', 'summary'],
    queryFn: getChildSummary
  })

  if (isLoading) return null

  const { missed = [], today = [], thisWeek = [], thisMonth = [], recentlyCompleted = [], closestMine, closestShared } = data || {}

  return (
    <div className="flex gap-6 h-full">
      {/* Left: Rewards (fixed), Recently Completed (1/2), Missed (1/2) */}
      <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0">
        <div className="shrink-0">
          <RewardSection mine={closestMine} shared={closestShared} />
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <CompletedSection assignments={recentlyCompleted} />
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <MissedSection assignments={missed} />
        </div>
      </div>

      {/* Right: Today, This Week, This Month — each gets 1/3 */}
      <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
          <TodaySection assignments={today} />
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <WeekSection assignments={thisWeek} />
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <MonthSection assignments={thisMonth} />
        </div>
      </div>
    </div>
  )
}


// ─── Missed Section ──────────────────────────────────────────────────────────

function MissedSection({ assignments }) {
  const [commentingId, setCommentingId] = useState(null)

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return 'today'
    if (days === 1) return 'yesterday'
    return `${days} days ago`
  }

  return (
    <section className="flex flex-col gap-2 min-h-0 flex-1">
      <h2 className="text-sm font-medium text-red-400/70 uppercase tracking-wider px-1 shrink-0">
        ⚠️ Missed ({assignments.length})
      </h2>
      {assignments.length === 0 ? (
        <EmptyCard />
      ) : (
        <ScrollFade className="flex flex-col gap-3 overflow-y-auto scrollbar-hide h-full">
          {assignments.map(a => (
            <div key={a.id} className="bg-red-600/10 border border-red-500/20 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl">{a.emoji}</span>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{a.chore_title}</div>
                    <div className="text-xs text-white/40">{timeAgo(a.assigned_at)}</div>
                  </div>
                </div>
                <span className="text-sm text-white/50 font-semibold shrink-0">{a.points} pts</span>
              </div>
              <button
                onClick={() => setCommentingId(commentingId === a.id ? null : a.id)}
                className="py-1.5 rounded-lg bg-white/5 text-xs text-white/40 font-medium active:bg-white/10"
              >💬 Add Comment</button>
              {commentingId === a.id && (
                <CommentThread assignmentId={a.id} />
              )}
            </div>
          ))}
        </ScrollFade>
      )}
    </section>
  )
}


// ─── Today Section ───────────────────────────────────────────────────────────

function TodaySection({ assignments }) {
  return (
    <section className="flex flex-col gap-2 min-h-0 flex-1">
      <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1 shrink-0">
        📋 Today ({assignments.length})
      </h2>
      {assignments.length === 0 ? (
        <EmptyCard />
      ) : (
        <ScrollFade className="flex flex-col gap-3 overflow-y-auto scrollbar-hide h-full">
          {assignments.map(a => <SummaryCard key={a.id} assignment={a} />)}
        </ScrollFade>
      )}
    </section>
  )
}


// ─── This Week Section ───────────────────────────────────────────────────────

function WeekSection({ assignments }) {
  return (
    <section className="flex flex-col gap-2 min-h-0 flex-1">
      <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1 shrink-0">
        📅 This Week ({assignments.length})
      </h2>
      {assignments.length === 0 ? (
        <EmptyCard />
      ) : (
        <ScrollFade className="flex flex-col gap-3 overflow-y-auto scrollbar-hide h-full">
          {assignments.map(a => <SummaryCard key={a.id} assignment={a} />)}
        </ScrollFade>
      )}
    </section>
  )
}


// ─── This Month Section ──────────────────────────────────────────────────────

function MonthSection({ assignments }) {
  return (
    <section className="flex flex-col gap-2 min-h-0 flex-1">
      <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1 shrink-0">
        📆 This Month ({assignments.length})
      </h2>
      {assignments.length === 0 ? (
        <EmptyCard />
      ) : (
        <ScrollFade className="flex flex-col gap-3 overflow-y-auto scrollbar-hide h-full">
          {assignments.map(a => <SummaryCard key={a.id} assignment={a} />)}
        </ScrollFade>
      )}
    </section>
  )
}


// ─── Summary Card (shared for today/week/month) ─────────────────────────────

function SummaryCard({ assignment }) {
  const { chore_title, emoji, points, status, frequency, day_of_week, day_of_month } = assignment
  const recurrence = formatRecurrence(frequency, day_of_week, day_of_month)

  const statusColor = {
    assigned: 'text-white/50',
    in_progress: 'text-amber-300',
    paused: 'text-orange-300',
    parent_paused: 'text-orange-300',
    submitted: 'text-sky-300',
    rejected: 'text-red-300'
  }

  return (
    <div className="bg-white/15 rounded-xl p-4 flex items-center gap-3">
      <span className="text-2xl">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{chore_title}</div>
        <div className={`text-xs mt-0.5 ${statusColor[status] || 'text-white/50'}`}>
          {STATUS_LABELS[status] ?? status}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {recurrence && <span className="text-xs text-white/40">🔁 {recurrence}</span>}
        <span className="text-sm font-semibold text-white/70">{points} pts</span>
      </div>
    </div>
  )
}


// ─── Closest Rewards Section ─────────────────────────────────────────────────

function RewardSection({ mine, shared }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1 shrink-0">
        🎁 Closest Rewards
      </h2>
      {!mine && !shared ? (
        <div className="bg-white/5 rounded-xl p-4 flex items-center justify-center">
          <div className="text-xs text-white/30">No active rewards</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {mine && <RewardCard reward={mine} label="My Reward" />}
          {shared && <RewardCard reward={shared} label="Shared Reward" />}
        </div>
      )}
    </section>
  )
}

function RewardCard({ reward, label }) {
  const pct = Math.min(100, (reward.my_contribution / reward.points_required) * 100)

  return (
    <div className="bg-white/15 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">{reward.name}</div>
        <span className="text-xs text-white/30">{label}</span>
      </div>
      <div className="text-xs text-white/40">
        {reward.my_contribution} / {reward.points_required} pts — {reward.remaining} to go
      </div>
      <div className="w-full bg-white/10 rounded-full h-2">
        <div
          className="bg-indigo-500 h-2 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}


// ─── Recently Completed Section ──────────────────────────────────────────────

function CompletedSection({ assignments }) {
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return 'today'
    if (days === 1) return 'yesterday'
    return `${days} days ago`
  }

  return (
    <section className="flex flex-col gap-2 min-h-0 flex-1">
      <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1 shrink-0">
        ✅ Completed Recently ({assignments.length})
      </h2>
      {assignments.length === 0 ? (
        <EmptyCard />
      ) : (
        <ScrollFade className="flex flex-col gap-3 overflow-y-auto scrollbar-hide h-full">
          {assignments.map(a => (
            <div key={a.id} className="bg-green-600/10 rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-green-400">✓</span>
                <span className="text-2xl">{a.emoji}</span>
                <span className="text-white/50 text-sm truncate">{a.chore_title}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-semibold text-green-400">+{a.points} pts</span>
                <span className="text-xs text-white/30">{timeAgo(a.completed_at)}</span>
              </div>
            </div>
          ))}
        </ScrollFade>
      )}
    </section>
  )
}

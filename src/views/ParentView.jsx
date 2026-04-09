import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSwipeable } from 'react-swipeable'
import { useAuth } from '../context/AuthContext'
import { buildAvatarSrc } from '../utils/avatar'
import { getParentDashboard } from '../api/dashboard'
import { pauseAllActive, unstartAssignment } from '../api/assignments'
import { approveReward, rejectReward, approveRefund, rejectRefund } from '../api/rewards'
import { useKboard } from '../hooks/useKboard'
import ProfileSettingsModal from '../components/ProfileSettingsModal'
import ApprovalCard from '../components/ApprovalCard'
import ChildSummaryCard from '../components/ChildSummaryCard'
import ChoresTab from '../components/ChoresTab'
import ParentHistoryTab from '../components/ParentHistoryTab'
import ParentUsersTab from '../components/ParentUsersTab'
import ParentRewardsTab from '../components/ParentRewardsTab'
import ParentToDoTab from '../components/ParentToDoTab'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'todo', label: 'ToDo' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'chores', label: 'Chores' },
  { id: 'history', label: 'History' },
  { id: 'users', label: 'Users' }
]
const TAB_IDS = TABS.map(t => t.id)

export default function ParentView() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showSettings, setShowSettings] = useState(false)
  const scrollRef = useRef(null)
  const [tabOverflows, setTabOverflows] = useState(false)

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const check = () => setTabOverflows(el.scrollHeight > el.clientHeight + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [activeTab])

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'parent'],
    queryFn: getParentDashboard
  })

  const currentIndex = TAB_IDS.indexOf(activeTab)
  const swipeHandlers = useSwipeable({
    onSwipedLeft: (e) => { if (e.event.target.closest?.('[data-no-swipe]')) return; if (currentIndex < TAB_IDS.length - 1) setActiveTab(TAB_IDS[currentIndex + 1]) },
    onSwipedRight: (e) => { if (e.event.target.closest?.('[data-no-swipe]')) return; if (currentIndex > 0) setActiveTab(TAB_IDS[currentIndex - 1]) },
    trackTouch: true,
    delta: 50
  })

  return (
    <div className="h-screen bg-app-gradient text-white flex flex-col">

      {/* Header */}
      <div className="flex items-center px-6 py-3 border-b border-white/10 gap-4">
        <div className="flex items-center gap-3 min-w-0 w-48">
          <button onClick={() => setShowSettings(true)} className="shrink-0">
            <img src={buildAvatarSrc(user.avatar)} alt={user.name} className="w-12 h-12 rounded-full" />
          </button>
          <span className="text-lg font-semibold truncate">{user.nick_name || user.name}</span>
        </div>

        <div className="flex-1 flex justify-center gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3.5 rounded-lg text-base font-medium transition-colors
                ${activeTab === tab.id ? 'bg-white/15 text-white' : 'text-white/40 active:text-white/70'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-48 flex justify-end">
          <button onClick={logout} className="text-sm text-white/50 active:text-white/80">
            Log out
          </button>
        </div>
      </div>

      {showSettings && <ProfileSettingsModal onClose={() => setShowSettings(false)} />}

      {/* Content */}
      <div className="relative flex-1 min-h-0">
        <div ref={scrollRef} className={`h-full p-4 ${activeTab === 'dashboard' ? 'overflow-hidden' : 'overflow-y-auto scrollbar-hide'}`} {...swipeHandlers}>
          {activeTab === 'dashboard' && <DashboardTab data={data} isLoading={isLoading} />}
          {activeTab === 'todo' && <ParentToDoTab />}
          {activeTab === 'rewards' && <ParentRewardsTab />}
          {activeTab === 'chores' && <ChoresTab />}
          {activeTab === 'history' && <ParentHistoryTab />}
          {activeTab === 'users' && <ParentUsersTab />}
        </div>
        {activeTab !== 'dashboard' && tabOverflows && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent" />
        )}
      </div>

    </div>
  )
}

function DashboardTab({ data, isLoading }) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dashboard', 'parent'] })

  const pauseAll = useMutation({
    mutationFn: pauseAllActive,
    onSuccess: invalidate
  })

  if (isLoading) return null

  const submissions    = data?.submittedAssignments ?? []
  const active         = data?.activeAssignments ?? []
  const children       = data?.children ?? []
  const pendingRewards = data?.pendingRewards ?? []
  // Group refund requests by (reward_id, child_id) and sum points
  const refundMap = {}
  for (const r of (data?.refundRequests ?? [])) {
    const key = `${r.reward_id}-${r.child_id}`
    if (!refundMap[key]) refundMap[key] = { ...r, points: 0 }
    refundMap[key].points += r.points
  }
  const refunds = Object.values(refundMap)

  const requestCount = submissions.length + pendingRewards.length + refunds.length

  return (
    <div className="flex gap-4 h-full">

      {/* Left: active chores */}
      <div className="flex-1 flex flex-col gap-5 min-w-0">

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1">
            Active Chores ({active.length})
          </h2>
          {active.length > 0 ? (
            <ScrollFade className="grid grid-cols-2 gap-3 overflow-y-auto max-h-36 scrollbar-hide">
              {active.map(a => <ActiveChoreCard key={a.id} assignment={a} onSuccess={invalidate} />)}
            </ScrollFade>
          ) : (
            <div
              className="h-36 flex items-center justify-center rounded-xl"
              style={{ background: 'linear-gradient(to bottom left, rgba(20,184,166,0.15), rgba(255,255,255,0.08), rgba(168,85,247,0.15))' }}
            >
              <span className="text-2xl font-black text-white uppercase tracking-widest">No Active Chores</span>
            </div>
          )}
        </section>

        <section className="flex-1 min-h-0 flex flex-col gap-3">
          <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1">
            Productivity
          </h2>
          <div
            className="flex-1 flex items-center justify-center rounded-xl border-2 border-dashed border-white/10"
          >
            <span className="text-white/20 text-lg font-medium tracking-wide">Coming Soon</span>
          </div>
        </section>

      </div>

      {/* Right: children, unassigned, requests */}
      <div className="w-[22rem] flex flex-col gap-3 shrink-0 h-full min-h-0">
        <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1">Children</h2>
        <button
          onClick={() => pauseAll.mutate()}
          disabled={pauseAll.isPending}
          className="py-3 rounded-xl bg-orange-600/80 font-medium text-sm disabled:opacity-40 active:bg-orange-600"
        >
          Pause All Active
        </button>
        {children.map(child => (
          <ChildSummaryCard key={child.id} child={child} />
        ))}
        {requestCount > 0 && (
          <RequestsPanel
            submissions={submissions}
            pendingRewards={pendingRewards}
            refunds={refunds}
            invalidate={invalidate}
            requestCount={requestCount}
          />
        )}
      </div>

    </div>
  )
}


// ─── Scroll container with conditional bottom fade ───────────────────────────

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
    <div className="relative">
      <div ref={ref} className={className}>{children}</div>
      {overflows && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-900 to-transparent" />
      )}
    </div>
  )
}


// ─── Dashboard Requests Panel ────────────────────────────────────────────────

function RequestsPanel({ submissions, pendingRewards, refunds, invalidate, requestCount }) {
  const scrollRef = useRef(null)
  const [overflows, setOverflows] = useState(false)

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [requestCount])

  return (
    <section className="flex flex-col gap-3 mt-3 flex-1 min-h-0">
      <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1 shrink-0">
        Requests ({requestCount})
      </h2>
      <div className="relative flex-1 min-h-0">
        <div ref={scrollRef} className="absolute inset-0 flex flex-col gap-3 overflow-y-auto scrollbar-hide">
          {submissions.map(a => <ApprovalCard key={a.id} assignment={a} />)}
          {pendingRewards.map(r => <DashRewardCard key={r.id} reward={r} onSuccess={invalidate} />)}
          {refunds.map(r => <DashRefundCard key={`${r.reward_id}-${r.child_id}`} refund={r} onSuccess={invalidate} />)}
        </div>
        {overflows && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-900 to-transparent" />
        )}
      </div>
    </section>
  )
}


// ─── Dashboard Active Chore Card ────────────────────────────────────────────

const ACTIVE_STATUS_LABELS = {
  in_progress: 'In progress',
  paused: 'Paused',
  parent_paused: 'Paused by parent'
}

function ActiveChoreCard({ assignment, onSuccess }) {
  const [confirming, setConfirming] = useState(false)
  const confirmTimer = useRef(null)

  const unstart = useMutation({
    mutationFn: () => unstartAssignment(assignment.id),
    onSuccess
  })

  const handleUnstart = () => {
    if (confirming) {
      clearTimeout(confirmTimer.current)
      setConfirming(false)
      unstart.mutate()
    } else {
      setConfirming(true)
      confirmTimer.current = setTimeout(() => setConfirming(false), 3000)
    }
  }

  useEffect(() => {
    return () => clearTimeout(confirmTimer.current)
  }, [])

  const started = assignment.started_at ? new Date(assignment.started_at) : null
  const startedLabel = started
    ? `${String(started.getMonth() + 1).padStart(2, '0')}/${String(started.getDate()).padStart(2, '0')} ${String(started.getHours()).padStart(2, '0')}:${String(started.getMinutes()).padStart(2, '0')}`
    : ''

  return (
    <div className="bg-white/15 rounded-xl p-4 flex items-stretch gap-3 h-28">
      <div className="flex-1 flex items-center gap-3 min-w-0">
        <img src={buildAvatarSrc(assignment.child_avatar)} alt={assignment.child_name} className="w-16 h-16 rounded-full" />
        <span className="text-3xl">{assignment.emoji}</span>
        <div className="min-w-0">
          <div className="font-semibold text-xl leading-tight truncate">{assignment.chore_title}</div>
          <div className="text-base text-white/40 mt-0.5">
            {assignment.child_name} · {ACTIVE_STATUS_LABELS[assignment.status]}
          </div>
        </div>
      </div>
      <div className="w-[20%] shrink-0 flex flex-col items-center gap-1">
        <div className="text-sm font-semibold text-orange-400">{startedLabel}</div>
        <button
          onClick={handleUnstart}
          disabled={unstart.isPending}
          className={`w-full flex-1 rounded-lg text-lg font-bold text-slate-900 disabled:opacity-40 transition-colors ${
            confirming
              ? 'bg-orange-600/80 active:bg-orange-600'
              : 'bg-teal-400/80 active:bg-teal-400'
          }`}
        >
          {confirming ? 'Confirm?' : 'Un-start'}
        </button>
      </div>
    </div>
  )
}


// ─── Dashboard Reward Request Card ───────────────────────────────────────────

function DashRewardCard({ reward, onSuccess }) {
  const [approving, setApproving] = useState(false)
  const [points, setPoints] = useState('')
  const kbPoints = useKboard(points, setPoints, { mode: 'numeric' })
  const cardRef = useRef(null)

  useEffect(() => {
    if (approving) cardRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [approving])

  const approve = useMutation({
    mutationFn: () => approveReward(reward.id, Number(points)),
    onSuccess: () => { onSuccess(); setApproving(false); setPoints('') }
  })

  const reject = useMutation({
    mutationFn: () => rejectReward(reward.id),
    onSuccess
  })

  const valid = points && Number(points) > 0 && Number(points) % 10 === 0

  return (
    <div ref={cardRef} className="bg-white/15 rounded-xl p-4 flex flex-col gap-2 border-l-4 border-amber-400/70">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/70">Reward Request</span>
      {approving ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPoints(p => String(Math.max(0, (Number(p) || 0) - 10)))}
            disabled={!points || Number(points) <= 0}
            className="w-11 h-11 rounded-lg bg-rose-600/70 text-xl font-bold disabled:opacity-30 active:bg-rose-600 shrink-0"
          >−</button>
          <input
            type="number"
            inputMode="none"
            value={points}
            {...kbPoints}
            placeholder="Pts"
            className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-sm outline-none placeholder:text-white/30 text-center appearance-none"
          />
          <button
            type="button"
            onClick={() => setPoints(p => String((Number(p) || 0) + 10))}
            className="w-11 h-11 rounded-lg bg-green-600/70 text-xl font-bold active:bg-green-600 shrink-0"
          >+</button>
          <button
            onClick={() => approve.mutate()}
            disabled={!valid || approve.isPending}
            className="w-11 h-11 rounded-lg bg-green-600/80 text-xl font-bold disabled:opacity-40 active:bg-green-600"
          >✓</button>
          <button
            onClick={() => { setApproving(false); setPoints('') }}
            className="w-11 h-11 rounded-lg bg-white/10 text-xl font-bold active:bg-white/20"
          >✕</button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex-1 flex flex-col gap-0.5 min-w-0">
            <span className="font-semibold leading-tight truncate">{reward.name}</span>
            {reward.description && (
              <span className="text-xs text-white/40 truncate">{reward.description}</span>
            )}
            <span className="text-xs text-white/30">{reward.created_by_name}</span>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0 w-20">
            <button
              onClick={() => setApproving(true)}
              className="py-2 rounded-lg text-sm font-medium bg-green-600/80 active:bg-green-600"
            >Approve</button>
            <button
              onClick={() => reject.mutate()}
              disabled={reject.isPending}
              className="py-2 rounded-lg text-sm font-medium bg-rose-600/80 active:bg-rose-600 disabled:opacity-40"
            >Reject</button>
          </div>
        </div>
      )}
    </div>
  )
}


// ─── Dashboard Refund Card ────────────────────────────────────────────────────

function DashRefundCard({ refund, onSuccess }) {
  const approveR = useMutation({
    mutationFn: () => approveRefund(refund.reward_id, refund.child_id),
    onSuccess
  })

  const rejectR = useMutation({
    mutationFn: () => rejectRefund(refund.reward_id, refund.child_id),
    onSuccess
  })

  return (
    <div className="bg-white/15 rounded-xl p-4 flex flex-col gap-2 border-l-4 border-rose-400/70">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400/70">Refund Request</span>
      <div className="flex items-center gap-3">
        <div className="flex-1 flex flex-col gap-0.5 min-w-0">
          <span className="font-semibold leading-tight truncate">{refund.reward_name}</span>
          <span className="text-xs text-white/40">{refund.child_name}</span>
          <span className="text-sm text-white/50">{refund.points} pts</span>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0 w-20">
          <button
            onClick={() => approveR.mutate()}
            disabled={approveR.isPending || rejectR.isPending}
            className="py-2 rounded-lg text-sm font-medium bg-green-600/80 active:bg-green-600 disabled:opacity-40"
          >Refund</button>
          <button
            onClick={() => rejectR.mutate()}
            disabled={rejectR.isPending || approveR.isPending}
            className="py-2 rounded-lg text-sm font-medium bg-rose-600/80 active:bg-rose-600 disabled:opacity-40"
          >Deny</button>
        </div>
      </div>
    </div>
  )
}

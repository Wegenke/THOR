import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSwipeable } from 'react-swipeable'
import { useAuth } from '../context/AuthContext'
import { buildAvatarSrc } from '../utils/avatar'
import { getParentDashboard } from '../api/dashboard'
import { pauseAllActive, unstartAssignment } from '../api/assignments'
import { getProfiles } from '../api/auth'
import ProfileSettingsModal from '../components/ProfileSettingsModal'
import RewardDetailModal from '../components/RewardDetailModal'
import CreateRewardModal from '../components/CreateRewardModal'
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
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showSettings, setShowSettings] = useState(false)
  const scrollRef = useRef(null)
  const [tabOverflows, setTabOverflows] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showCreateReward, setShowCreateReward] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 300)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const check = () => setTabOverflows(el.scrollHeight > el.clientHeight + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    const mo = new MutationObserver(check)
    mo.observe(el, { childList: true, subtree: true })
    el.addEventListener('scroll', check, { passive: true })
    return () => { ro.disconnect(); mo.disconnect(); el.removeEventListener('scroll', check) }
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
        <div {...swipeHandlers} ref={(el) => { scrollRef.current = el; if (swipeHandlers.ref) swipeHandlers.ref(el) }} className={`h-full p-4 ${activeTab === 'dashboard' ? 'overflow-hidden' : 'overflow-y-auto scrollbar-hide'}`} style={mounted ? undefined : { pointerEvents: 'none' }}>
          {activeTab === 'dashboard' && <DashboardTab data={data} isLoading={isLoading} onCreateReward={() => setShowCreateReward(true)} />}
          {activeTab === 'todo' && <ParentToDoTab />}
          {activeTab === 'rewards' && <ParentRewardsTab />}
          {activeTab === 'chores' && <ChoresTab />}
          {activeTab === 'history' && <ParentHistoryTab />}
          {activeTab === 'users' && <ParentUsersTab />}
        </div>
        {activeTab === 'rewards' && (
          <button
            onClick={() => setShowCreateReward(true)}
            className="absolute top-2 right-6 z-10 px-3 py-1 rounded-lg bg-indigo-600/70 text-sm font-medium active:bg-indigo-600"
          >+ New Shared Reward</button>
        )}
        {activeTab !== 'dashboard' && tabOverflows && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent" />
        )}
      </div>

      {showCreateReward && (
        <CreateRewardModal
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['rewards'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'parent'] })
          }}
          onClose={() => setShowCreateReward(false)}
        />
      )}

    </div>
  )
}

function DashboardTab({ data, isLoading, onCreateReward }) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dashboard', 'parent'] })
  const [rewardModal, setRewardModal] = useState(null)

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: getProfiles
  })

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
  const rewardInvalidate = () => {
    invalidate()
    queryClient.invalidateQueries({ queryKey: ['rewards'] })
  }

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
        <div className="flex gap-2">
          <button
            onClick={() => pauseAll.mutate()}
            disabled={pauseAll.isPending}
            className="flex-1 py-3 rounded-xl bg-orange-600/80 font-medium text-sm disabled:opacity-40 active:bg-orange-600"
          >
            Pause All Active
          </button>
          <button
            onClick={onCreateReward}
            className="flex-1 py-3 rounded-xl bg-indigo-600/80 font-medium text-sm active:bg-indigo-600"
          >
            + Shared Reward
          </button>
        </div>
        {children.map(child => (
          <ChildSummaryCard key={child.id} child={child} />
        ))}
        {requestCount > 0 && (
          <RequestsPanel
            submissions={submissions}
            pendingRewards={pendingRewards}
            refunds={refunds}
            requestCount={requestCount}
            onRewardClick={(item, type) => setRewardModal({ item, type })}
          />
        )}
      </div>

      {rewardModal && (
        <RewardDetailModal
          item={rewardModal.item}
          type={rewardModal.type}
          profiles={profiles}
          onSuccess={rewardInvalidate}
          onClose={() => setRewardModal(null)}
        />
      )}


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

function RequestsPanel({ submissions, pendingRewards, refunds, requestCount, onRewardClick }) {
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
          {pendingRewards.map(r => <DashRewardCard key={r.id} reward={r} onClick={() => onRewardClick(r, 'pending')} />)}
          {refunds.map(r => <DashRefundCard key={`${r.reward_id}-${r.child_id}`} refund={r} onClick={() => onRewardClick(r, 'refunds')} />)}
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


// ─── Dashboard Reward Request Card (info-only) ─────────────────────────────

function DashRewardCard({ reward, onClick }) {
  return (
    <div onClick={onClick} className="bg-white/15 rounded-xl p-4 flex flex-col gap-3 border-l-4 border-amber-400/70 cursor-pointer active:bg-white/20">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/70">Reward Request</span>
      <div className="flex items-center gap-3 px-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold leading-tight truncate">{reward.name}</div>
          <span className="text-white/50 text-sm">{reward.created_by_name}</span>
        </div>
        <img src={buildAvatarSrc(reward.created_by_avatar)} alt={reward.created_by_name} className="w-10 h-10 rounded-full" />
      </div>
    </div>
  )
}


// ─── Dashboard Refund Card (info-only) ──────────────────────────────────────

function DashRefundCard({ refund, onClick }) {
  return (
    <div onClick={onClick} className="bg-white/15 rounded-xl p-4 flex flex-col gap-3 border-l-4 border-rose-400/70 cursor-pointer active:bg-white/20">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400/70">Refund Request</span>
        <span className="text-white font-semibold text-sm whitespace-nowrap">{refund.points} pts</span>
      </div>
      <div className="flex items-center gap-3 px-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold leading-tight truncate">{refund.reward_name}</div>
          <span className="text-white/50 text-sm">{refund.child_name}</span>
        </div>
        <img src={buildAvatarSrc(refund.child_avatar)} alt={refund.child_name} className="w-10 h-10 rounded-full" />
      </div>
    </div>
  )
}

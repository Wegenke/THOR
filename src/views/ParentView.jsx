import { useState, useRef, useLayoutEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSwipeable } from 'react-swipeable'
import { useAuth } from '../context/AuthContext'
import { buildAvatarSrc } from '../utils/avatar'
import { getParentDashboard } from '../api/dashboard'
import { pauseAllActive, assignAssignment, cancelAssignment } from '../api/assignments'
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
        <div className="h-full overflow-y-auto scrollbar-hide p-4" {...swipeHandlers}>
          {activeTab === 'dashboard' && <DashboardTab data={data} isLoading={isLoading} />}
          {activeTab === 'todo' && <ParentToDoTab />}
          {activeTab === 'rewards' && <ParentRewardsTab />}
          {activeTab === 'chores' && <ChoresTab />}
          {activeTab === 'history' && <ParentHistoryTab />}
          {activeTab === 'users' && <ParentUsersTab />}
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent" />
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
  const children       = data?.children ?? []
  const pendingRewards = data?.pendingRewards ?? []
  const unassigned     = data?.unassignedAssignments ?? []

  // Group refund requests by (reward_id, child_id) and sum points
  const refundMap = {}
  for (const r of (data?.refundRequests ?? [])) {
    const key = `${r.reward_id}-${r.child_id}`
    if (!refundMap[key]) refundMap[key] = { ...r, points: 0 }
    refundMap[key].points += r.points
  }
  const refunds = Object.values(refundMap)

  const allEmpty = submissions.length === 0 && pendingRewards.length === 0 && refunds.length === 0 && unassigned.length === 0

  return (
    <div className="flex gap-4 h-full">

      {/* Left: action queue */}
      <div className="flex-1 flex flex-col gap-5 min-w-0">

        {allEmpty && (
          <div className="flex items-center justify-center h-32 text-white/30 text-sm">
            All caught up
          </div>
        )}

        {submissions.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1">
              Chore Approvals ({submissions.length})
            </h2>
            <ScrollFade className="grid grid-cols-3 gap-3 overflow-y-auto max-h-72 scrollbar-hide">
              {submissions.map(a => <ApprovalCard key={a.id} assignment={a} />)}
            </ScrollFade>
          </section>
        )}

        {pendingRewards.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1">
              Reward Requests ({pendingRewards.length})
            </h2>
            <ScrollFade className="grid grid-cols-3 gap-3 overflow-y-auto max-h-72 scrollbar-hide">
              {pendingRewards.map(r => <DashRewardCard key={r.id} reward={r} onSuccess={invalidate} />)}
            </ScrollFade>
          </section>
        )}

        {refunds.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1">
              Refund Requests ({refunds.length})
            </h2>
            <ScrollFade className="grid grid-cols-3 gap-3 overflow-y-auto max-h-72 scrollbar-hide">
              {refunds.map(r => <DashRefundCard key={`${r.reward_id}-${r.child_id}`} refund={r} onSuccess={invalidate} />)}
            </ScrollFade>
          </section>
        )}

        {unassigned.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1">
              Unassigned Chores ({unassigned.length})
            </h2>
            <ScrollFade className="grid grid-cols-3 gap-3 overflow-y-auto max-h-72 scrollbar-hide">
              {unassigned.map(a => (
                <DashUnassignedCard key={a.id} assignment={a} children={children} onSuccess={invalidate} />
              ))}
            </ScrollFade>
          </section>
        )}

      </div>

      {/* Right: children + pause all <w-82 may act up, revert to w-80>*/}
      <div className="w-82 flex flex-col gap-3 shrink-0">
        <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1">Children</h2>
        {children.map(child => (
          <ChildSummaryCard key={child.id} child={child} />
        ))}
        <button
          onClick={() => pauseAll.mutate()}
          disabled={pauseAll.isPending}
          className="mt-2 py-3 rounded-xl bg-orange-600/80 font-medium text-sm disabled:opacity-40 active:bg-orange-600"
        >
          Pause All Active
        </button>
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


// ─── Dashboard Reward Request Card ───────────────────────────────────────────

function DashRewardCard({ reward, onSuccess }) {
  const [approving, setApproving] = useState(false)
  const [points, setPoints] = useState('')
  const kbPoints = useKboard(points, setPoints, { mode: 'numeric' })

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
    <div className="bg-white/15 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="font-semibold leading-tight truncate">{reward.name}</span>
        {reward.description && (
          <span className="text-xs text-white/40 truncate">{reward.description}</span>
        )}
        <span className="text-xs text-white/30">{reward.created_by_name}</span>
      </div>

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
        <div className="flex gap-2">
          <button
            onClick={() => setApproving(true)}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-green-600/80 active:bg-green-600"
          >Approve</button>
          <button
            onClick={() => reject.mutate()}
            disabled={reject.isPending}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-rose-600/80 active:bg-rose-600 disabled:opacity-40"
          >Reject</button>
        </div>
      )}
    </div>
  )
}


// ─── Dashboard Unassigned Chore Card ─────────────────────────────────────────

function DashUnassignedCard({ assignment, children, onSuccess }) {
  const assign = useMutation({
    mutationFn: (child_id) => assignAssignment(assignment.id, child_id),
    onSuccess
  })

  const cancel = useMutation({
    mutationFn: () => cancelAssignment(assignment.id),
    onSuccess
  })

  const busy = assign.isPending || cancel.isPending

  return (
    <div className="bg-white/15 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{assignment.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold leading-tight truncate">{assignment.chore_title}</div>
          <div className="text-xs text-white/40 mt-0.5">{assignment.points} pts</div>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {children.map(child => (
          <button
            key={child.id}
            onClick={() => assign.mutate(child.id)}
            disabled={busy}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-blue-600/80 active:bg-blue-600 disabled:opacity-40"
          >
            {child.nick_name || child.name}
          </button>
        ))}
        <button
          onClick={() => cancel.mutate()}
          disabled={busy}
          className="py-2 px-3 rounded-lg text-sm font-medium bg-white/10 active:bg-white/20 disabled:opacity-40"
        >✕</button>
      </div>
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
    <div className="bg-white/15 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="font-semibold leading-tight truncate">{refund.reward_name}</span>
        <span className="text-xs text-white/40">{refund.child_name}</span>
      </div>
      <span className="text-sm text-white/50">{refund.points} pts</span>
      <div className="flex gap-2">
        <button
          onClick={() => approveR.mutate()}
          disabled={approveR.isPending || rejectR.isPending}
          className="flex-1 py-2 rounded-lg text-sm font-medium bg-green-600/80 active:bg-green-600 disabled:opacity-40"
        >Approve</button>
        <button
          onClick={() => rejectR.mutate()}
          disabled={rejectR.isPending || approveR.isPending}
          className="flex-1 py-2 rounded-lg text-sm font-medium bg-rose-600/80 active:bg-rose-600 disabled:opacity-40"
        >Reject</button>
      </div>
    </div>
  )
}

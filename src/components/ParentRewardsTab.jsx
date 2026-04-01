import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useKboard } from '../hooks/useKboard'
import { getProfiles } from '../api/auth'
import {
  getRewards, getRefundRequests,
  approveReward, rejectReward, cancelReward, redeemReward, archiveReward,
  approveRefund, rejectRefund
} from '../api/rewards'

const SECTIONS = [
  { id: 'pending',  label: 'Pending' },
  { id: 'active',   label: 'Active' },
  { id: 'funded',   label: 'Funded' },
  { id: 'refunds',  label: 'Refunds' },
  { id: 'redeemed', label: 'Redeemed' },
  { id: 'archived', label: 'Archived' },
]

export default function ParentRewardsTab() {
  const queryClient = useQueryClient()
  const [section, setSection] = useState('pending')

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ['rewards', 'all'],
    queryFn: () => getRewards({ sort: 'progress' })
  })

  const { data: refundRequests = [] } = useQuery({
    queryKey: ['rewards', 'refunds'],
    queryFn: getRefundRequests
  })

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: getProfiles
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['rewards'] })
  }

  if (isLoading) return null

  const pending  = rewards.filter(r => r.status === 'pending')
  const active   = rewards.filter(r => r.status === 'active')
  const funded   = rewards.filter(r => r.status === 'funded')
  const redeemed = rewards.filter(r => r.status === 'redeemed')
  const archived = rewards.filter(r => r.status === 'archived')

  // Group refund requests by (reward_id, child_id) and sum points
  const refundMap = {}
  for (const r of refundRequests) {
    const key = `${r.reward_id}-${r.child_id}`
    if (!refundMap[key]) refundMap[key] = { ...r, points: 0 }
    refundMap[key].points += r.points
  }
  const refunds = Object.values(refundMap)

  const badge = (count) => count > 0 ? ` (${count})` : ''

  return (
    <div className="flex flex-col gap-4">

      <div className="flex gap-1">
        {SECTIONS.map(s => {
          const count = s.id === 'pending' ? pending.length
            : s.id === 'funded'  ? funded.length
            : s.id === 'refunds' ? refunds.length
            : null
          return (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${section === s.id ? 'bg-white/20 text-white' : 'text-white/40 active:text-white/70'}`}>
              {s.label}{badge(count)}
            </button>
          )
        })}
      </div>

      {section === 'pending'  && <PendingSection  rewards={pending}  profiles={profiles} onSuccess={invalidate} />}
      {section === 'active'   && <ActiveSection   rewards={active}   profiles={profiles} onSuccess={invalidate} />}
      {section === 'funded'   && <FundedSection   rewards={funded}   onSuccess={invalidate} />}
      {section === 'refunds'  && <RefundsSection  refunds={refunds}  onSuccess={invalidate} />}
      {section === 'redeemed' && <RedeemedSection rewards={redeemed} onSuccess={invalidate} />}
      {section === 'archived' && <ArchivedSection rewards={archived} />}

    </div>
  )
}


// ─── Pending ─────────────────────────────────────────────────────────────────

function PendingSection({ rewards, profiles, onSuccess }) {
  if (rewards.length === 0) return <Empty text="No pending reward requests." />
  return (
    <div className="grid grid-cols-3 gap-3">
      {rewards.map(r => <PendingCard key={r.id} reward={r} profiles={profiles} onSuccess={onSuccess} />)}
    </div>
  )
}

function PendingCard({ reward, profiles, onSuccess }) {
  const [approving, setApproving] = useState(false)
  const [points, setPoints] = useState('')
  const kbPoints = useKboard(points, setPoints, { mode: 'numeric' })

  const requester = profiles.find(p => p.id === reward.created_by)

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
    <div className="bg-white/10 rounded-xl p-4 flex flex-col gap-3">

      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-semibold leading-tight truncate">{reward.name}</span>
          {reward.description && (
            <span className="text-xs text-white/40 truncate">{reward.description}</span>
          )}
          {requester && (
            <span className="text-xs text-white/30">
              Requested by {requester.nick_name || requester.name}
            </span>
          )}
        </div>
        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs shrink-0">Pending</span>
      </div>

      {approving ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPoints(p => String(Math.max(10, (Number(p) || 10) - 10)))}
            disabled={!points || Number(points) <= 10}
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


// ─── Active ──────────────────────────────────────────────────────────────────

function ActiveSection({ rewards, profiles, onSuccess }) {
  if (rewards.length === 0) return <Empty text="No active rewards." />
  return (
    <div className="grid grid-cols-3 gap-3">
      {rewards.map(r => <ActiveCard key={r.id} reward={r} profiles={profiles} onSuccess={onSuccess} />)}
    </div>
  )
}

function ActiveCard({ reward, profiles, onSuccess }) {
  const contributed = parseInt(reward.contributed_total) || 0
  const pct = Math.min(100, Math.round((contributed / reward.points_required) * 100))
  const remaining = reward.points_required - contributed
  const requester = profiles.find(p => p.id === reward.created_by)

  const cancel = useMutation({
    mutationFn: () => cancelReward(reward.id),
    onSuccess
  })

  return (
    <div className="bg-white/10 rounded-xl p-4 flex flex-col gap-3">

      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-semibold leading-tight truncate">{reward.name}</span>
          {reward.description && (
            <span className="text-xs text-white/40 truncate">{reward.description}</span>
          )}
          {requester && (
            <span className="text-xs text-white/30">
              {requester.nick_name || requester.name}
            </span>
          )}
        </div>
        {reward.is_shared && (
          <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs shrink-0">Shared</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-400 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-white/40">
          <span>{contributed} / {reward.points_required} pts</span>
          <span>{remaining} remaining</span>
        </div>
      </div>

      <button
        onClick={() => cancel.mutate()}
        disabled={cancel.isPending}
        className="py-2 rounded-lg text-sm font-medium bg-rose-600/80 active:bg-rose-600 disabled:opacity-40"
      >Cancel &amp; Refund All</button>

    </div>
  )
}


// ─── Funded ──────────────────────────────────────────────────────────────────

function FundedSection({ rewards, onSuccess }) {
  if (rewards.length === 0) return <Empty text="No funded rewards awaiting redemption." />
  return (
    <div className="grid grid-cols-3 gap-3">
      {rewards.map(r => <FundedCard key={r.id} reward={r} onSuccess={onSuccess} />)}
    </div>
  )
}

function FundedCard({ reward, onSuccess }) {
  const redeem = useMutation({
    mutationFn: () => redeemReward(reward.id),
    onSuccess
  })

  return (
    <div className="bg-white/10 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-semibold leading-tight truncate">{reward.name}</span>
          {reward.description && (
            <span className="text-xs text-white/40 truncate">{reward.description}</span>
          )}
        </div>
        <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 text-xs shrink-0">Funded</span>
      </div>
      <span className="text-sm text-white/50">{reward.points_required} pts</span>
      <button
        onClick={() => redeem.mutate()}
        disabled={redeem.isPending}
        className="py-2 rounded-lg text-sm font-medium bg-green-600/80 active:bg-green-600 disabled:opacity-40"
      >Mark Redeemed</button>
    </div>
  )
}


// ─── Refunds ─────────────────────────────────────────────────────────────────

function RefundsSection({ refunds, onSuccess }) {
  if (refunds.length === 0) return <Empty text="No pending refund requests." />
  return (
    <div className="grid grid-cols-3 gap-3">
      {refunds.map(r => (
        <RefundCard key={`${r.reward_id}-${r.child_id}`} refund={r} onSuccess={onSuccess} />
      ))}
    </div>
  )
}

function RefundCard({ refund, onSuccess }) {
  const approveR = useMutation({
    mutationFn: () => approveRefund(refund.reward_id, refund.child_id),
    onSuccess
  })

  const rejectR = useMutation({
    mutationFn: () => rejectRefund(refund.reward_id, refund.child_id),
    onSuccess
  })

  return (
    <div className="bg-white/10 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-semibold leading-tight truncate">{refund.reward_name}</span>
          <span className="text-xs text-white/40">{refund.child_name}</span>
        </div>
        <span className="text-xs text-amber-400 shrink-0">Refund Requested</span>
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


// ─── Redeemed ────────────────────────────────────────────────────────────────

function RedeemedSection({ rewards, onSuccess }) {
  if (rewards.length === 0) return <Empty text="No redeemed rewards to archive." />
  return (
    <div className="grid grid-cols-3 gap-3">
      {rewards.map(r => <RedeemedCard key={r.id} reward={r} onSuccess={onSuccess} />)}
    </div>
  )
}

function RedeemedCard({ reward, onSuccess }) {
  const archive = useMutation({
    mutationFn: () => archiveReward(reward.id),
    onSuccess
  })

  return (
    <div className="bg-white/10 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="font-semibold truncate">{reward.name}</span>
        {reward.description && (
          <span className="text-xs text-white/40 truncate">{reward.description}</span>
        )}
      </div>
      <span className="text-sm text-white/50">{reward.points_required} pts</span>
      <button
        onClick={() => archive.mutate()}
        disabled={archive.isPending}
        className="py-2 rounded-lg text-sm font-medium bg-violet-600/80 active:bg-violet-600 disabled:opacity-40"
      >Archive</button>
    </div>
  )
}


// ─── Archived ────────────────────────────────────────────────────────────────

function ArchivedSection({ rewards }) {
  if (rewards.length === 0) return <Empty text="No archived rewards." />
  return (
    <div className="grid grid-cols-3 gap-3">
      {rewards.map(r => <ArchivedCard key={r.id} reward={r} />)}
    </div>
  )
}

function ArchivedCard({ reward }) {
  return (
    <div className="bg-white/5 rounded-xl p-4 flex flex-col gap-2 opacity-60">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-semibold leading-tight truncate">{reward.name}</span>
          {reward.description && (
            <span className="text-xs text-white/40 truncate">{reward.description}</span>
          )}
        </div>
        <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/40 text-xs shrink-0">Archived</span>
      </div>
      <span className="text-sm text-white/40">{reward.points_required} pts</span>
    </div>
  )
}


// ─── Shared ───────────────────────────────────────────────────────────────────

function Empty({ text }) {
  return (
    <div className="flex items-center justify-center h-48 text-white/40">
      <p>{text}</p>
    </div>
  )
}

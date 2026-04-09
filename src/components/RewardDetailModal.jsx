import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useKboard } from '../hooks/useKboard'
import {
  approveReward, rejectReward, cancelReward, redeemReward, archiveReward,
  approveRefund, rejectRefund
} from '../api/rewards'

export default function RewardDetailModal({ item, type, profiles, onSuccess, onClose }) {
  const [points, setPoints] = useState('')
  const kbPoints = useKboard(points, setPoints, { mode: 'numeric' })

  const approve = useMutation({
    mutationFn: () => approveReward(item.id, Number(points)),
    onSuccess: () => { onSuccess(); onClose() }
  })

  const reject = useMutation({
    mutationFn: () => rejectReward(item.id),
    onSuccess: () => { onSuccess(); onClose() }
  })

  const cancel = useMutation({
    mutationFn: () => cancelReward(item.id),
    onSuccess: () => { onSuccess(); onClose() }
  })

  const redeem = useMutation({
    mutationFn: () => redeemReward(item.id),
    onSuccess: () => { onSuccess(); onClose() }
  })

  const archive = useMutation({
    mutationFn: () => archiveReward(item.id),
    onSuccess: () => { onSuccess(); onClose() }
  })

  const approveR = useMutation({
    mutationFn: () => approveRefund(item.reward_id, item.child_id),
    onSuccess: () => { onSuccess(); onClose() }
  })

  const rejectR = useMutation({
    mutationFn: () => rejectRefund(item.reward_id, item.child_id),
    onSuccess: () => { onSuccess(); onClose() }
  })

  const valid = points && Number(points) > 0 && Number(points) % 10 === 0
  const requester = profiles.find(p => p.id === item.created_by)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[28rem] bg-slate-800 rounded-2xl p-5 flex flex-col gap-4" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <span className="font-semibold truncate pr-4">{item.name || item.reward_name}</span>
          <button onClick={onClose} className="text-white/50 active:text-white/80 text-lg shrink-0">✕</button>
        </div>

        {/* Info */}
        {item.description && <span className="text-sm text-white/40">{item.description}</span>}

        {type === 'pending' && requester && (
          <span className="text-sm text-white/30">Requested by {requester.nick_name || requester.name}</span>
        )}

        {type === 'active' && (
          <>
            {requester && <span className="text-sm text-white/30">{requester.nick_name || requester.name}</span>}
            <ProgressBar reward={item} />
            {item.is_shared && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs self-start">Shared</span>
            )}
          </>
        )}

        {type === 'funded' && (
          <span className="text-sm text-white/50">{item.points_required} pts</span>
        )}

        {type === 'refunds' && (
          <>
            <span className="text-sm text-white/40">{item.child_name}</span>
            <span className="text-sm text-white/50">{item.points} pts</span>
          </>
        )}

        {type === 'redeemed' && (
          <span className="text-sm text-white/50">{item.points_required} pts</span>
        )}

        {type === 'archived' && (
          <span className="text-sm text-white/40">{item.points_required} pts</span>
        )}

        {/* Actions */}
        {type === 'pending' && (
          <div className="flex flex-col gap-3">
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
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => approve.mutate()}
                disabled={!valid || approve.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-green-600/80 active:bg-green-600 disabled:opacity-40"
              >Approve</button>
              <button
                onClick={() => reject.mutate()}
                disabled={reject.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-rose-600/80 active:bg-rose-600 disabled:opacity-40"
              >Reject</button>
            </div>
          </div>
        )}

        {type === 'active' && (
          <button
            onClick={() => cancel.mutate()}
            disabled={cancel.isPending}
            className="py-2.5 rounded-xl text-sm font-medium bg-rose-600/80 active:bg-rose-600 disabled:opacity-40"
          >Cancel &amp; Refund All</button>
        )}

        {type === 'funded' && (
          <button
            onClick={() => redeem.mutate()}
            disabled={redeem.isPending}
            className="py-2.5 rounded-xl text-sm font-medium bg-green-600/80 active:bg-green-600 disabled:opacity-40"
          >Mark Redeemed</button>
        )}

        {type === 'refunds' && (
          <div className="flex gap-2">
            <button
              onClick={() => approveR.mutate()}
              disabled={approveR.isPending || rejectR.isPending}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-green-600/80 active:bg-green-600 disabled:opacity-40"
            >Approve Refund</button>
            <button
              onClick={() => rejectR.mutate()}
              disabled={rejectR.isPending || approveR.isPending}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-rose-600/80 active:bg-rose-600 disabled:opacity-40"
            >Reject Refund</button>
          </div>
        )}

        {type === 'redeemed' && (
          <button
            onClick={() => archive.mutate()}
            disabled={archive.isPending}
            className="py-2.5 rounded-xl text-sm font-medium bg-violet-600/80 active:bg-violet-600 disabled:opacity-40"
          >Archive</button>
        )}

      </div>
    </div>
  )
}


function ProgressBar({ reward }) {
  const contributed = parseInt(reward.contributed_total) || 0
  const pct = Math.min(100, Math.round((contributed / reward.points_required) * 100))
  const remaining = reward.points_required - contributed
  return (
    <div className="flex flex-col gap-1">
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-white/40">
        <span>{contributed} / {reward.points_required} pts</span>
        <span>{remaining} remaining</span>
      </div>
    </div>
  )
}

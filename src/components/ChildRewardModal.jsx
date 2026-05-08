import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { contributeToReward, requestRefund, cancelRefund } from '../api/rewards'

export default function ChildRewardModal({ reward, userId, pointsBalance = 0, onClose }) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dashboard', 'child'] })

  const [amount, setAmount] = useState(0)

  const canInteract = reward.is_shared || reward.created_by === userId
  const required = reward.points_required
  const mine = reward.my_contribution ?? 0
  const total = parseInt(reward.contributed_total) || 0
  const remaining = reward.remaining ?? Math.max(0, required - total)
  const myPct = Math.min(100, Math.round((mine / required) * 100))
  const othersPct = Math.min(100 - myPct, Math.round(((total - mine) / required) * 100))
  const totalPct = myPct + othersPct

  const maxContrib = Math.floor(Math.min(remaining, pointsBalance) / 10) * 10
  const canFundAll = canInteract && reward.status !== 'funded' && pointsBalance >= remaining && remaining > 0
  const canContribute = canInteract && reward.status !== 'funded' && maxContrib > 0
  const refundEligible = mine > 0 && !reward.refund_requested

  const contribute = useMutation({
    mutationFn: () => contributeToReward(reward.id, amount),
    onSuccess: () => { invalidate(); onClose() }
  })

  const refund = useMutation({
    mutationFn: () => requestRefund(reward.id),
    onSuccess: () => { invalidate(); onClose() }
  })

  const cancelMyRefund = useMutation({
    mutationFn: () => cancelRefund(reward.id),
    onSuccess: () => { invalidate(); onClose() }
  })

  const bump = (delta) => setAmount(a => Math.max(0, Math.min(maxContrib, a + delta)))
  const fundAll = () => setAmount(remaining)
  const reset = () => setAmount(0)

  const busy = contribute.isPending || refund.isPending || cancelMyRefund.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[28rem] bg-slate-800 rounded-2xl p-5 flex flex-col gap-4" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold truncate pr-4">{reward.name}</span>
          <button onClick={onClose} className="text-white/50 active:text-white/80 text-lg shrink-0">✕</button>
        </div>

        {reward.description && (
          <span className="text-sm text-white/40">{reward.description}</span>
        )}

        <div className="flex flex-col gap-1">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden flex">
            <div className="h-full bg-indigo-500 transition-all" style={{ width: `${myPct}%` }} />
            <div className="h-full bg-indigo-300/40 transition-all" style={{ width: `${othersPct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-white/40">
            <span>{remaining} pts remaining</span>
            <span>{totalPct}%</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-white/50">You've contributed</span>
          <span className="font-semibold">{mine} pts</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/50">Your balance</span>
          <span className="font-semibold">{pointsBalance} pts</span>
        </div>

        {reward.status === 'funded' && (
          <span className="self-start px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 text-xs">Funded</span>
        )}

        {/* Contribution controls */}
        {canContribute && (
          <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
            <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Contribute</span>
            <div className="flex gap-2">
              <button
                onClick={() => bump(10)}
                disabled={busy || amount + 10 > maxContrib}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600/80 text-sm font-medium disabled:opacity-30 active:bg-indigo-600"
              >+10</button>
              <button
                onClick={() => bump(50)}
                disabled={busy || amount + 50 > maxContrib}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600/80 text-sm font-medium disabled:opacity-30 active:bg-indigo-600"
              >+50</button>
              <button
                onClick={() => bump(100)}
                disabled={busy || amount + 100 > maxContrib}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600/80 text-sm font-medium disabled:opacity-30 active:bg-indigo-600"
              >+100</button>
              <button
                onClick={() => bump(-10)}
                disabled={busy || amount < 10}
                className="flex-1 py-2.5 rounded-xl bg-rose-600/50 text-sm font-medium disabled:opacity-30 active:bg-rose-600/70"
              >−10</button>
            </div>
            {canFundAll && (
              <button
                onClick={fundAll}
                disabled={busy || amount === remaining}
                className="py-2.5 rounded-xl bg-green-600/80 text-sm font-medium disabled:opacity-40 active:bg-green-600"
              >Fund All ({remaining} pts)</button>
            )}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-white/50 text-sm">Selected</span>
                <span className="font-bold text-base">{amount} pts</span>
              </div>
              <button
                onClick={reset}
                disabled={busy || amount === 0}
                className="px-3 py-1.5 rounded-lg bg-white/10 text-sm font-medium disabled:opacity-30 active:bg-white/20"
              >↺ Reset</button>
            </div>
            <button
              onClick={() => contribute.mutate()}
              disabled={busy || amount === 0}
              className="py-3 rounded-xl bg-indigo-600/90 text-base font-semibold disabled:opacity-30 active:bg-indigo-600"
            >Contribute {amount} pts</button>
          </div>
        )}

        {/* Refund */}
        {(refundEligible || reward.refund_requested) && (
          <button
            onClick={() => {
              if (reward.refund_requested) cancelMyRefund.mutate()
              else refund.mutate()
            }}
            disabled={busy}
            className={`py-2.5 rounded-xl text-sm font-medium disabled:opacity-40
              ${reward.refund_requested
                ? 'bg-amber-600/80 active:bg-amber-600'
                : 'bg-rose-600/80 active:bg-rose-600'}`}
          >
            {reward.refund_requested ? 'Cancel Refund Request' : 'Request Refund'}
          </button>
        )}

      </div>
    </div>
  )
}

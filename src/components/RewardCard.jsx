import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { contributeToReward, requestRefund } from '../api/rewards'

export default function RewardCard({ reward, userId }) {
  const queryClient = useQueryClient()
  const [contributing, setContributing] = useState(false)
  const [amount, setAmount] = useState(10)

  const canInteract = reward.is_shared || reward.created_by === userId

  const contribute = useMutation({
    mutationFn: (value) => contributeToReward(reward.id, parseInt(value)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'child'] })
      setContributing(false)
      setAmount(10)
    }
  })

  const refund = useMutation({
    mutationFn: () => requestRefund(reward.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard', 'child'] })
  })

  const required = reward.points_required
  const mine = reward.my_contribution ?? 0
  const total = parseInt(reward.contributed_total) || 0
  const myPct     = Math.min(100, Math.round((mine / required) * 100))
  const othersPct = Math.min(100 - myPct, Math.round(((total - mine) / required) * 100))
  const totalPct  = myPct + othersPct

  const refundEligible = mine > 0 && !reward.refund_requested

  return (
    <div className={`bg-white/10 rounded-xl p-4 flex flex-col gap-3 ${!canInteract ? 'opacity-60' : ''}`}>

      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-semibold leading-tight truncate">{reward.name}</span>
          {reward.description && (
            <span className="text-xs text-white/40 truncate">{reward.description}</span>
          )}
        </div>
        {reward.status === 'funded' && (
          <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 text-xs shrink-0">Funded</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden flex">
          <div className="h-full bg-indigo-500 transition-all" style={{ width: `${myPct}%` }} />
          <div className="h-full bg-indigo-300/40 transition-all" style={{ width: `${othersPct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-white/40">
          <span>{reward.remaining} pts remaining</span>
          <span>{totalPct}%</span>
        </div>
      </div>

      {mine > 0 && (
        <span className="text-xs text-white/50">You've contributed {mine} pts</span>
      )}

      {contributing ? (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAmount(a => Math.max(10, a - 10))}
            disabled={amount <= 10}
            className="w-11 h-11 rounded-lg bg-white/10 text-xl font-bold disabled:opacity-30 active:bg-white/20"
          >
            −
          </button>
          <div className="flex-1 text-center font-bold text-xl">{amount} pts</div>
          <button
            onClick={() => setAmount(a => Math.min(reward.remaining, a + 10))}
            disabled={amount >= reward.remaining}
            className="w-11 h-11 rounded-lg bg-white/10 text-xl font-bold disabled:opacity-30 active:bg-white/20"
          >
            +
          </button>
          <button
            onClick={() => contribute.mutate(amount)}
            disabled={contribute.isPending}
            className="w-11 h-11 rounded-lg bg-green-600/80 text-xl font-bold disabled:opacity-40 active:bg-green-600"
          >
            ✓
          </button>
          <button
            onClick={() => { setContributing(false); setAmount(10) }}
            className="w-11 h-11 rounded-lg bg-red-600/80 text-xl font-bold active:bg-red-600"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setContributing(true)}
            disabled={!canInteract || reward.status === 'funded'}
            className={`flex-1 py-2 rounded-lg text-sm font-medium
              ${canInteract && reward.status !== 'funded'
                ? 'bg-indigo-600/80 active:bg-indigo-600'
                : 'bg-indigo-600/20 text-indigo-300/40 cursor-default'}`}
          >
            Contribute
          </button>
          <button
            onClick={() => refundEligible && refund.mutate()}
            disabled={!refundEligible || refund.isPending}
            className={`flex-1 py-2 rounded-lg text-sm font-medium
              ${reward.refund_requested
                ? 'bg-amber-500/10 text-amber-400/60 cursor-default'
                : refundEligible
                  ? 'bg-rose-600/80 text-white active:bg-rose-600'
                  : 'bg-white/5 text-white/20 cursor-default'}`}
          >
            {reward.refund_requested ? 'Refund Pending' : 'Request Refund'}
          </button>
        </div>
      )}

    </div>
  )
}

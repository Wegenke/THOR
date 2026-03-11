import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { contributeToReward } from '../api/rewards'

export default function RewardCard({ reward }) {
  const queryClient = useQueryClient()
  const [contributing, setContributing] = useState(false)
  const [amount, setAmount] = useState('')

  const contribute = useMutation({
    mutationFn: () => contributeToReward(reward.id, parseInt(amount)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'child'] })
      setContributing(false)
      setAmount('')
    }
  })

  const pct = Math.min(100, Math.round((parseInt(reward.contributed_total) / reward.points_required) * 100))

  return (
    <div className="bg-white/10 rounded-xl p-4 flex flex-col gap-3">

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
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-white/40">
          <span>{reward.remaining} pts remaining</span>
          <span>{pct}%</span>
        </div>
      </div>

      {reward.my_contribution > 0 && (
        <span className="text-xs text-white/50">You've contributed {reward.my_contribution} pts</span>
      )}

      {contributing ? (
        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Points"
            min={10}
            max={reward.remaining}
            step={10}
            className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-sm outline-none"
          />
          <button
            onClick={() => contribute.mutate()}
            disabled={!amount || parseInt(amount) < 10 || parseInt(amount) % 10 !== 0 || contribute.isPending}
            className="px-4 py-2 rounded-lg bg-indigo-600/80 text-sm font-medium disabled:opacity-40 active:bg-indigo-600"
          >
            Confirm
          </button>
          <button
            onClick={() => { setContributing(false); setAmount('') }}
            className="px-3 py-2 rounded-lg bg-white/10 text-sm"
          >
            ✕
          </button>
        </div>
      ) : (
        reward.status !== 'funded' && (
          <button
            onClick={() => setContributing(true)}
            className="py-2 rounded-lg bg-white/10 text-sm font-medium active:bg-white/20"
          >
            Contribute
          </button>
        )
      )}

    </div>
  )
}

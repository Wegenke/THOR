import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useKboard } from '../hooks/useKboard'
import { buildAvatarSrc } from '../utils/avatar'
import { createAdjustment } from '../api/adjustments'

export default function AdjustPointsModal({ child, onClose }) {
  const queryClient = useQueryClient()
  const [points, setPoints] = useState('')
  const [reason, setReason] = useState('')
  const [isReward, setIsReward] = useState(true)
  const reasonKb = useKboard(reason, setReason)
  const pointsKb = useKboard(points, setPoints, { mode: 'numeric' })

  const numPoints = Number(points) || 0
  const finalPoints = isReward ? numPoints : -numPoints
  const valid = numPoints > 0 && numPoints % 10 === 0 && reason.trim().length > 0

  const mutation = useMutation({
    mutationFn: () => createAdjustment({
      child_id: child.id,
      points: finalPoints,
      reason: reason.trim()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'parent'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onClose()
    }
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-96 bg-slate-800 rounded-2xl p-5 flex flex-col gap-4" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {child.avatar && (
              <img src={buildAvatarSrc(child.avatar)} alt={child.name} className="w-10 h-10 rounded-full" />
            )}
            <span className="font-semibold">{child.nick_name || child.name}</span>
          </div>
          <button onClick={onClose} className="text-white/50 active:text-white/80 text-lg">✕</button>
        </div>

        {/* Reward / Penalty toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsReward(true)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${isReward ? 'bg-green-600/80 text-white' : 'bg-white/10 text-white/50'}`}
          >+ Reward</button>
          <button
            onClick={() => setIsReward(false)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${!isReward ? 'bg-red-600/80 text-white' : 'bg-white/10 text-white/50'}`}
          >− Penalty</button>
        </div>

        {/* Points stepper */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPoints(p => String(Math.max(0, (Number(p) || 0) - 10)))}
            disabled={numPoints <= 0}
            className="w-12 h-12 rounded-lg bg-rose-600/70 text-xl font-bold disabled:opacity-30 active:bg-rose-600 shrink-0"
          >−</button>
          <input
            type="number"
            inputMode="none"
            value={points}
            {...pointsKb}
            placeholder="Pts"
            className="flex-1 bg-white/10 rounded-lg px-3 py-3 text-sm outline-none placeholder:text-white/30 text-center appearance-none"
          />
          <button
            onClick={() => setPoints(p => String((Number(p) || 0) + 10))}
            className="w-12 h-12 rounded-lg bg-green-600/70 text-xl font-bold active:bg-green-600 shrink-0"
          >+</button>
        </div>
        {numPoints > 0 && numPoints % 10 !== 0 && (
          <span className="text-xs text-amber-400">Must be in increments of 10</span>
        )}

        {/* Reason */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-white/50">Reason</label>
          <textarea
            inputMode="none"
            value={reason}
            {...reasonKb}
            rows={2}
            placeholder={isReward ? 'What did they do well?' : 'What happened?'}
            className="bg-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-white/30 resize-none placeholder:text-white/30"
          />
        </div>

        {mutation.isError && (
          <p className="text-xs text-red-400">{mutation.error?.response?.data?.message ?? 'Something went wrong'}</p>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/10 text-sm font-medium active:bg-white/20">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!valid || mutation.isPending}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40 ${
              isReward ? 'bg-green-600/80 active:bg-green-600' : 'bg-red-600/80 active:bg-red-600'
            }`}
          >
            {isReward ? 'Give' : 'Deduct'} {numPoints > 0 ? `${numPoints} pts` : ''}
          </button>
        </div>

      </div>
    </div>
  )
}

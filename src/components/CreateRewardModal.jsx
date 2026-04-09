import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useKboard } from '../hooks/useKboard'
import { createReward } from '../api/rewards'

export default function CreateRewardModal({ onSuccess, onClose }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [points, setPoints] = useState('')

  const nameKb = useKboard(name, setName)
  const descKb = useKboard(description, setDescription)
  const pointsKb = useKboard(points, setPoints, { mode: 'numeric' })

  const numPoints = Number(points) || 0
  const valid = name.trim() && numPoints > 0 && numPoints % 10 === 0

  const mutation = useMutation({
    mutationFn: () => createReward({
      name,
      description: description || undefined,
      points_required: numPoints,
      is_shared: true
    }),
    onSuccess: () => { onSuccess(); onClose() }
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[28rem] bg-slate-800 rounded-2xl p-5 flex flex-col gap-4" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <span className="font-semibold">New Shared Reward</span>
          <button onClick={onClose} className="text-white/50 active:text-white/80 text-lg">✕</button>
        </div>

        <input
          inputMode="none"
          value={name}
          {...nameKb}
          placeholder="Reward name"
          className="bg-white/10 rounded-xl px-4 py-3 text-sm outline-none placeholder:text-white/30"
        />

        <textarea
          inputMode="none"
          value={description}
          {...descKb}
          placeholder="Description (optional)"
          rows={2}
          className="bg-white/10 rounded-xl px-4 py-3 text-sm outline-none resize-none placeholder:text-white/30"
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPoints(p => String(Math.max(10, (Number(p) || 10) - 10)))}
            disabled={numPoints <= 10}
            className="w-11 h-11 rounded-lg bg-rose-600/70 text-xl font-bold disabled:opacity-30 active:bg-rose-600 shrink-0"
          >−</button>
          <input
            type="number"
            inputMode="none"
            value={points}
            {...pointsKb}
            placeholder="Points required"
            className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-sm outline-none placeholder:text-white/30 text-center appearance-none"
          />
          <button
            type="button"
            onClick={() => setPoints(p => String((Number(p) || 0) + 10))}
            className="w-11 h-11 rounded-lg bg-green-600/70 text-xl font-bold active:bg-green-600 shrink-0"
          >+</button>
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
            className="flex-1 py-2.5 rounded-xl bg-green-600/80 text-sm font-medium disabled:opacity-40 active:bg-green-600"
          >Create</button>
        </div>

      </div>
    </div>
  )
}

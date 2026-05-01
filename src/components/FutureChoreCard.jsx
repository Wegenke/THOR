import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { startAhead } from '../api/assignments'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatRecurrence(frequency, day_of_week, day_of_month) {
  if (frequency === 'weekly' && day_of_week != null) return DAY_NAMES[day_of_week]
  if (frequency === 'monthly' && day_of_month != null) {
    const suffix = day_of_month === 1 || day_of_month === 21 ? 'st'
      : day_of_month === 2 || day_of_month === 22 ? 'nd'
      : day_of_month === 3 || day_of_month === 23 ? 'rd' : 'th'
    return `${day_of_month}${suffix}`
  }
  return null
}

export default function FutureChoreCard({ schedule }) {
  const queryClient = useQueryClient()
  const [showDescription, setShowDescription] = useState(false)

  const start = useMutation({
    mutationFn: () => startAhead(schedule.chore_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'child'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'child', 'summary'] })
    }
  })

  const { chore_title, emoji, points, description, frequency, day_of_week, day_of_month } = schedule
  const dayLabel = formatRecurrence(frequency, day_of_week, day_of_month)

  return (
    <>
      <div className="bg-white/10 rounded-xl p-3 flex items-center gap-3">
        <button
          className="flex items-center gap-3 flex-1 min-w-0 text-left active:opacity-70"
          onClick={() => description && setShowDescription(true)}
        >
          <span className="text-2xl shrink-0">{emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{chore_title}</div>
            {dayLabel && <div className="text-xs text-white/40 mt-0.5">🔁 {dayLabel}</div>}
          </div>
          <span className="text-sm font-semibold text-white/70 shrink-0">{points} pts</span>
        </button>
        <button
          onPointerDown={() => start.mutate()}
          disabled={start.isPending}
          className="px-4 py-2 rounded-lg bg-blue-600/70 text-sm font-medium disabled:opacity-40 active:bg-blue-600 shrink-0"
        >
          Start ahead
        </button>
      </div>

      {showDescription && description && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowDescription(false)}>
          <div className="w-[32rem] bg-slate-800 rounded-2xl p-5 flex flex-col gap-3"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{emoji}</span>
                <span className="font-semibold text-lg">{chore_title}</span>
              </div>
              <button onClick={() => setShowDescription(false)} className="text-white/50 active:text-white/80 text-lg">✕</button>
            </div>
            <p className="text-white/70 leading-relaxed">{description}</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white font-semibold">{points} pts</span>
              {dayLabel && <span className="text-white/40">🔁 {dayLabel}</span>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

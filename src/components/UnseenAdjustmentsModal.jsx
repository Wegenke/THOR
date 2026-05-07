import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import confetti from 'canvas-confetti'
import { markAllSeen } from '../api/adjustments'

export default function UnseenAdjustmentsModal({ adjustments, onDone }) {
  const queryClient = useQueryClient()
  const [exiting, setExiting] = useState(false)

  const hasPositive = adjustments.some(a => a.points > 0)
  const hasNegative = adjustments.some(a => a.points < 0)
  const negativeOnly = hasNegative && !hasPositive

  const dismiss = useMutation({
    mutationFn: markAllSeen,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'child'] })
    }
  })

  const handleDismiss = () => {
    if (exiting) return
    dismiss.mutate()
    setExiting(true)
  }

  useEffect(() => {
    if (!exiting) return
    const t = setTimeout(onDone, 400)
    return () => clearTimeout(t)
  }, [exiting, onDone])

  useEffect(() => {
    if (!hasPositive || exiting) return
    const t = setTimeout(() => {
      const scalar = 2
      confetti({
        shapes: [
          confetti.shapeFromText({ text: '🔥', scalar }),
          confetti.shapeFromText({ text: '💥', scalar })
        ],
        particleCount: 60,
        spread: 90,
        scalar,
        origin: { y: 0.6 }
      })
    }, 600)
    return () => clearTimeout(t)
  }, [hasPositive, exiting])

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days === 1) return 'yesterday'
    return `${days}d ago`
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-[99] pointer-events-none transition-opacity duration-[400ms] ${
          negativeOnly ? 'bg-red-500/25' : 'bg-black/70'
        } ${exiting ? 'opacity-0' : ''}`}
      />

      <div
        className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-200 ${
          exiting ? 'opacity-0 pointer-events-none' : ''
        }`}
      >
        <div
          className={`w-[28rem] bg-slate-800 rounded-2xl p-6 flex flex-col gap-5 ${
            exiting
              ? ''
              : negativeOnly
                ? 'animate-modal-enter-shake'
                : 'animate-modal-enter'
          }`}
        >

          <h2 className="text-lg font-semibold text-center">Point Adjustments</h2>

          <div className="flex flex-col gap-3 max-h-80 overflow-y-auto scrollbar-hide">
            {adjustments.map((a, i) => (
              <div
                key={a.id}
                className={`rounded-xl p-4 flex flex-col gap-1 ${
                  exiting ? '' : 'animate-card-enter'
                } ${a.points > 0 ? 'bg-green-600/15' : 'bg-red-600/15'}`}
                style={{ animationDelay: exiting ? undefined : `${i * 50}ms` }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-lg font-bold ${exiting ? '' : 'animate-points-pop'} ${
                      a.points > 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                    style={{ animationDelay: exiting ? undefined : `${i * 50 + 150}ms` }}
                  >
                    {a.points > 0 ? '+' : ''}{a.points} pts
                  </span>
                  <span className="text-xs text-white/30">{timeAgo(a.created_at)}</span>
                </div>
                <div className="text-sm text-white/70">{a.reason}</div>
                <div className="text-xs text-white/30">{a.parent_nick_name || a.parent_name}</div>
              </div>
            ))}
          </div>

          <button
            onClick={handleDismiss}
            disabled={dismiss.isPending || exiting}
            className="py-3 rounded-xl bg-indigo-600/80 font-medium text-sm disabled:opacity-40 active:bg-indigo-600"
          >Got it</button>

        </div>
      </div>
    </>
  )
}

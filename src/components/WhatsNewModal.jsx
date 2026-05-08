import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { markAllNotificationsSeen } from '../api/notifications'

const TYPE_DISPLAY = {
  chore_approved:     { emoji: '✅', single: 'Chore approved',           plural: 'chores approved' },
  chore_rejected:     { emoji: '❌', single: 'Chore rejected',           plural: 'chores rejected' },
  assignment_given:   { emoji: '📋', single: 'New chore',                plural: 'new chores' },
  reward_approved:    { emoji: '✨', single: 'Reward approved',          plural: 'rewards approved' },
  reward_rejected:    { emoji: '🚫', single: 'Reward rejected',          plural: 'rewards rejected' },
  reward_funded:      { emoji: '🎉', single: 'Reward fully funded!',     plural: 'rewards fully funded!' },
  reward_cancelled:   { emoji: '🗑️', single: 'Reward cancelled',         plural: 'rewards cancelled' },
  refund_approved:    { emoji: '💵', single: 'Refund approved',          plural: 'refunds approved' },
  refund_rejected:    { emoji: '🙅', single: 'Refund rejected',          plural: 'refunds rejected' },
  bug_status_changed: { emoji: '🐛', single: 'Bug report status changed', plural: 'bug reports updated' }
}

const FALLBACK = { emoji: '🔔', single: 'Notification', plural: 'notifications' }

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

export default function WhatsNewModal({ notifications, onDone }) {
  const queryClient = useQueryClient()
  const [exiting, setExiting] = useState(false)

  const grouped = (() => {
    const map = new Map()
    for (const n of notifications) {
      const existing = map.get(n.type)
      if (!existing) {
        map.set(n.type, { type: n.type, count: 1, latest: n.created_at })
      } else {
        existing.count += 1
        if (new Date(n.created_at) > new Date(existing.latest)) {
          existing.latest = n.created_at
        }
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.latest) - new Date(a.latest)
    )
  })()

  const dismiss = useMutation({
    mutationFn: markAllNotificationsSeen,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unseen'] })
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
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

  return (
    <>
      <div
        className={`fixed inset-0 z-[99] pointer-events-none bg-black/70 transition-opacity duration-[400ms] ${
          exiting ? 'opacity-0' : ''
        }`}
      />

      <div
        className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-200 ${
          exiting ? 'opacity-0 pointer-events-none' : ''
        }`}
      >
        <div className={`w-[28rem] bg-slate-800 rounded-2xl p-6 flex flex-col gap-5 ${exiting ? '' : 'animate-modal-enter'}`}>

          <h2 className="text-lg font-semibold text-center">What's New</h2>

          <div className="flex flex-col gap-3 max-h-80 overflow-y-auto scrollbar-hide">
            {grouped.map((g, i) => {
              const display = TYPE_DISPLAY[g.type] || FALLBACK
              const label = g.count === 1 ? display.single : `${g.count} ${display.plural}`
              return (
                <div
                  key={g.type}
                  className={`bg-white/10 rounded-xl p-4 flex items-center justify-between gap-3 ${exiting ? '' : 'animate-card-enter'}`}
                  style={{ animationDelay: exiting ? undefined : `${i * 50}ms` }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">{display.emoji}</span>
                    <span className="text-sm text-white/85 truncate">{label}</span>
                  </div>
                  <span className="text-xs text-white/30 shrink-0">{timeAgo(g.latest)}</span>
                </div>
              )
            })}
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

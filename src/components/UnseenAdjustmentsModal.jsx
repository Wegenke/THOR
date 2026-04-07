import { useMutation, useQueryClient } from '@tanstack/react-query'
import { markAllSeen } from '../api/adjustments'

export default function UnseenAdjustmentsModal({ adjustments, onDone }) {
  const queryClient = useQueryClient()

  const dismiss = useMutation({
    mutationFn: markAllSeen,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustments', 'unseen'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'child'] })
      onDone()
    }
  })

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70">
      <div className="w-[28rem] bg-slate-800 rounded-2xl p-6 flex flex-col gap-5">

        <h2 className="text-lg font-semibold text-center">Point Adjustments</h2>

        <div className="flex flex-col gap-3 max-h-80 overflow-y-auto scrollbar-hide">
          {adjustments.map(a => (
            <div key={a.id} className={`rounded-xl p-4 flex flex-col gap-1 ${
              a.points > 0 ? 'bg-green-600/15' : 'bg-red-600/15'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-lg font-bold ${a.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
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
          onClick={() => dismiss.mutate()}
          disabled={dismiss.isPending}
          className="py-3 rounded-xl bg-indigo-600/80 font-medium text-sm disabled:opacity-40 active:bg-indigo-600"
        >Got it</button>

      </div>
    </div>
  )
}

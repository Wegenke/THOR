import { useMutation, useQueryClient } from '@tanstack/react-query'
import { requestRefund } from '../api/rewards'

export default function MyRewardCard({ reward }) {
  const queryClient = useQueryClient()
  const refund = useMutation({
    mutationFn: () => requestRefund(reward.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard', 'child'] })
  })

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white/10 rounded-xl">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="font-medium truncate">{reward.name}</span>
        <span className="text-xs text-white/40">{reward.points_required} pts required</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={`px-2 py-0.5 rounded-full text-xs ${
          reward.status === 'active' ? 'bg-sky-500/20 text-sky-300' : 'bg-white/10 text-white/50'
        }`}>
          {reward.status}
        </span>
        {reward.status === 'active' && (
          <button
            onClick={() => refund.mutate()}
            disabled={refund.isPending}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-950/60 text-red-400 disabled:opacity-40 active:bg-red-900/60"
          >
            Refund
          </button>
        )}
      </div>
    </div>
  )
}

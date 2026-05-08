import { useState } from 'react'
import ChildRewardModal from './ChildRewardModal'

export default function RewardCard({ reward, userId, pointsBalance = 0 }) {
  const [showModal, setShowModal] = useState(false)

  const canInteract = reward.is_shared || reward.created_by === userId

  const required = reward.points_required
  const mine = reward.my_contribution ?? 0
  const total = parseInt(reward.contributed_total) || 0
  const myPct = Math.min(100, Math.round((mine / required) * 100))
  const othersPct = Math.min(100 - myPct, Math.round(((total - mine) / required) * 100))
  const totalPct = myPct + othersPct

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        className={`bg-white/15 rounded-xl p-4 flex flex-col gap-3 cursor-pointer active:bg-white/20 ${!canInteract ? 'opacity-60' : ''}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-semibold leading-tight truncate">{reward.name}</span>
            {reward.description && (
              <span className="text-xs text-white/40 truncate">{reward.description}</span>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {reward.status === 'funded' && (
              <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 text-xs">Funded</span>
            )}
            {reward.refund_requested && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs">Refund Pending</span>
            )}
          </div>
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
      </div>

      {showModal && (
        <ChildRewardModal
          reward={reward}
          userId={userId}
          pointsBalance={pointsBalance}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

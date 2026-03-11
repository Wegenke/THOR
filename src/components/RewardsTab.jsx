import { useState } from 'react'
import RewardCard from './RewardCard'
import MyRewardCard from './MyRewardCard'
import RequestRewardModal from './RequestRewardModal'

export default function RewardsTab({ data, isLoading }) {
  const [showModal, setShowModal] = useState(false)

  if (isLoading) return null
  const rewards = data?.rewards ?? []
  const myRewards = data?.myRewards ?? []

  return (
    <div className="flex flex-col gap-6">
      {rewards.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1">Household Rewards</h2>
          <div className="grid grid-cols-3 gap-3">
            {rewards.map(r => <RewardCard key={r.id} reward={r} />)}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 px-1">
          <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider">My Requests</h2>
          <button onClick={() => setShowModal(true)} className="px-2 py-0.5 rounded-md border border-white/20 text-xs text-white/60 active:border-white/40 active:text-white/80">
            Add reward
          </button>
        </div>

        {myRewards.length > 0 && (
          <div className="flex flex-col gap-2">
            {myRewards.map(r => <MyRewardCard key={r.id} reward={r} />)}
          </div>
        )}
      </div>

      {showModal && <RequestRewardModal onClose={() => setShowModal(false)} />}
    </div>
  )
}

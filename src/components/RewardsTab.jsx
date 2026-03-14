import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import RewardCard from './RewardCard'
import RequestRewardModal from './RequestRewardModal'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'Mine' },
  { id: 'shared', label: 'Shared' }
]

export default function RewardsTab({ data, isLoading }) {
  const { user } = useAuth()
  const [filter, setFilter] = useState('all')
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showRefundsModal, setShowRefundsModal] = useState(false)

  if (isLoading) return null
  const rewards = data?.rewards ?? []
  const pendingRequests = (data?.myRewards ?? []).filter(r => r.status === 'pending')

  const pendingRefunds = rewards.filter(r => r.refund_requested)

  const filtered = rewards.filter(r => {
    if (filter === 'mine') return r.created_by === user.id
    if (filter === 'shared') return r.is_shared
    return true
  })

  return (
    <div className="flex flex-col gap-4">

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${filter === f.id ? 'bg-white/20 text-white' : 'text-white/40 active:text-white/70'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setShowRequestModal(true)}
          className="px-3 py-1.5 rounded-lg border border-white/20 text-xs text-white/60 active:border-white/40 active:text-white/80">
          Request Reward
        </button>
        <button
          onClick={() => pendingRefunds.length > 0 && setShowRefundsModal(true)}
          disabled={pendingRefunds.length === 0}
          className={`px-3 py-1.5 rounded-lg border text-xs font-medium
            ${pendingRefunds.length > 0
              ? 'border-amber-500/40 text-amber-400 active:border-amber-500/60'
              : 'border-white/10 text-white/20 cursor-default'}`}>
          {pendingRefunds.length > 0 ? `Refunds (${pendingRefunds.length})` : 'Refunds'}
        </button>
      </div>

      {pendingRequests.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-white/40 font-medium uppercase tracking-wide px-1">Pending Approval</span>
          {pendingRequests.map(r => (
            <div key={r.id} className="flex items-center justify-between px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-medium text-sm truncate">{r.name}</span>
                {r.description && <span className="text-xs text-white/40 truncate">{r.description}</span>}
              </div>
              <span className="text-xs text-amber-400 shrink-0 ml-3">Awaiting approval</span>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-white/40">
          <p>No rewards to show.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {filtered.map(r => <RewardCard key={r.id} reward={r} userId={user.id} pointsBalance={data?.points_balance ?? 0} />)}
        </div>
      )}

      {showRequestModal && <RequestRewardModal onClose={() => setShowRequestModal(false)} />}

      {showRefundsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowRefundsModal(false)}>
          <div className="w-[28rem] bg-slate-800 rounded-2xl p-5 flex flex-col gap-3"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Pending Refunds</span>
              <button onClick={() => setShowRefundsModal(false)} className="text-white/50 active:text-white/80 text-lg">✕</button>
            </div>
            <div className="flex flex-col gap-2">
              {pendingRefunds.map(r => (
                <div key={r.id} className="flex items-center justify-between px-3 py-2.5 bg-white/10 rounded-xl">
                  <span className="font-medium text-sm">{r.name}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-white/50">{r.my_contribution} pts contributed</span>
                    <span className="text-xs text-amber-400">Awaiting approval</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

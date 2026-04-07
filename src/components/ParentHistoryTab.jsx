import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { buildAvatarSrc } from '../utils/avatar'
import { getHouseholdTransactions, getTransactionsByChild } from '../api/transactions'
import { getMissedAssignments } from '../api/assignments'

const TX_COLORS = {
  chore_approved: 'text-green-400',
  reward_contribution: 'text-red-400',
  reward_refund: 'text-amber-400',
  adjustment_reward: 'text-green-400',
  adjustment_penalty: 'text-red-400'
}

const SOURCE_LABELS = {
  chore_approved: 'Chore approved',
  reward_contribution: 'Reward contribution',
  reward_refund: 'Reward refund',
  adjustment_reward: 'Reward',
  adjustment_penalty: 'Penalty'
}

const SOURCE_EMOJI = {
  chore_approved: '✅',
  reward_contribution: '🎁',
  reward_refund: '↩️',
  adjustment_reward: '⭐',
  adjustment_penalty: '⚠️'
}

const TX_FILTERS = [
  { id: null, label: 'All' },
  { id: 'chore_approved', label: 'Chore Earned' },
  { id: 'reward_contribution', label: 'Contribution' },
  { id: 'reward_refund', label: 'Refund' },
  { id: 'adjustment_reward', label: 'Rewards' },
  { id: 'adjustment_penalty', label: 'Penalties' }
]

const TOP_TABS = [
  { id: 'transactions', label: 'Transactions' },
  { id: 'missed', label: 'Missed Chores' }
]

function TransactionRow({ tx, showChild = false, onChildClick }) {
  return (
    <div className="flex items-center justify-between px-5 py-5 bg-white/15 rounded-xl">
      <div className="flex items-start gap-2 min-w-0">
        <span className="text-base shrink-0">{SOURCE_EMOJI[tx.source]}</span>
        <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium truncate">{tx.reference_title ?? SOURCE_LABELS[tx.source]}</span>
        <div className="flex items-center gap-2 text-xs text-white/40">
          {showChild && tx.child_name && (
            <button
              onClick={() => onChildClick?.({ id: tx.child_id, name: tx.child_name, avatar: tx.child_avatar })}
              className="flex items-center gap-1 text-indigo-400/80 active:text-indigo-300 font-medium"
            >
              {tx.child_avatar && (
                <img src={buildAvatarSrc(tx.child_avatar)} alt={tx.child_name} className="w-4 h-4 rounded-full" />
              )}
              {tx.child_name}
            </button>
          )}
          {showChild && tx.child_name && <span>·</span>}
          <span>{new Date(tx.created_at).toLocaleDateString()}</span>
        </div>
        </div>
      </div>
      <span className={`font-semibold shrink-0 ml-4 ${TX_COLORS[tx.source] ?? 'text-white/60'}`}>
        {tx.amount > 0 ? '+' : ''}{tx.amount} pts
      </span>
    </div>
  )
}

function MissedRow({ item }) {
  return (
    <div className="flex items-center justify-between px-5 py-5 bg-red-600/10 border border-red-500/20 rounded-xl">
      <div className="flex items-start gap-2 min-w-0">
        <span className="text-base shrink-0">{item.emoji}</span>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-medium truncate">{item.chore_title}</span>
          <div className="flex items-center gap-2 text-xs text-white/40">
            {item.child_name && (
              <span className="flex items-center gap-1">
                {item.child_avatar && (
                  <img src={buildAvatarSrc(item.child_avatar)} alt={item.child_name} className="w-4 h-4 rounded-full" />
                )}
                {item.child_name}
              </span>
            )}
            {item.child_name && <span>·</span>}
            <span>{new Date(item.assigned_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      <span className="text-sm text-red-400 font-semibold shrink-0 ml-4">Missed</span>
    </div>
  )
}

function PaginatedList({ queryKey, queryFn, showChild, onChildClick }) {
  const [page, setPage] = useState(1)
  const [source, setSource] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: [...queryKey, page, source],
    queryFn: () => queryFn({ page, ...(source ? { source } : {}) })
  })

  const transactions = data?.data ?? []
  const { totalPages = 1 } = data?.pagination ?? {}

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 flex-wrap">
        {TX_FILTERS.map(f => (
          <button key={String(f.id)} onClick={() => { setSource(f.id); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${source === f.id ? 'bg-white/20 text-white' : 'text-white/40 active:text-white/70'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? null : transactions.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-white/40">
          <p>No transactions to show.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {transactions.map(tx => (
            <TransactionRow key={tx.id} tx={tx} showChild={showChild} onChildClick={onChildClick} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-2 px-1">
          <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
            className="text-sm text-white/50 disabled:opacity-30 active:text-white">
            ← Prev
          </button>
          <span className="text-sm text-white/30">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
            className="text-sm text-white/50 disabled:opacity-30 active:text-white">
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

function MissedList() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['assignments', 'missed', page],
    queryFn: () => getMissedAssignments({ page })
  })

  const items = data?.data ?? []
  const { totalPages = 1 } = data?.pagination ?? {}

  return (
    <div className="flex flex-col gap-3">
      {isLoading ? null : items.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-white/40">
          <p>No missed chores.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map(item => <MissedRow key={item.id} item={item} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-2 px-1">
          <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
            className="text-sm text-white/50 disabled:opacity-30 active:text-white">
            ← Prev
          </button>
          <span className="text-sm text-white/30">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
            className="text-sm text-white/50 disabled:opacity-30 active:text-white">
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

export default function ParentHistoryTab() {
  const [topTab, setTopTab] = useState('transactions')
  const [drillChild, setDrillChild] = useState(null)

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-4">
      {/* Top tabs */}
      <div className="flex gap-2">
        {TOP_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTopTab(t.id); setDrillChild(null) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${topTab === t.id ? 'bg-white/15 text-white' : 'text-white/40 active:text-white/70'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {topTab === 'missed' && <MissedList />}

      {topTab === 'transactions' && drillChild && (
        <>
          <div className="flex items-center gap-3">
            <button onClick={() => setDrillChild(null)}
              className="text-sm text-white/50 active:text-white/80">
              ← Back
            </button>
            <span className="font-semibold">{drillChild.name}</span>
          </div>
          <PaginatedList
            queryKey={['transactions', 'child', drillChild.id]}
            queryFn={(params) => getTransactionsByChild(drillChild.id, params)}
            showChild={false}
          />
        </>
      )}

      {topTab === 'transactions' && !drillChild && (
        <PaginatedList
          queryKey={['transactions', 'household']}
          queryFn={getHouseholdTransactions}
          showChild={true}
          onChildClick={setDrillChild}
        />
      )}
    </div>
  )
}

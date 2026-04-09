import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { buildAvatarSrc } from '../utils/avatar'
import { getProfiles } from '../api/auth'
import { getHouseholdTransactions } from '../api/transactions'
import { getMissedAssignments } from '../api/assignments'


// ─── Constants ──────────────────────────────────────────────────────────────

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

const SOURCES = [
  { id: 'chore_approved', label: 'Chore Earned', emoji: '✅' },
  { id: 'reward_contribution', label: 'Contribution', emoji: '🎁' },
  { id: 'reward_refund', label: 'Refund', emoji: '↩️' },
  { id: 'adjustment_reward', label: 'Rewards', emoji: '⭐' },
  { id: 'adjustment_penalty', label: 'Penalties', emoji: '⚠️' }
]


// ─── Main Orchestrator ──────────────────────────────────────────────────────

export default function ParentHistoryTab() {
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: getProfiles
  })

  const children = profiles.filter(p => p.role === 'child')

  return (
    <div className="flex gap-4 h-full">
      <div className="flex-[3] flex flex-col min-w-0 min-h-0">
        <TransactionsColumn children={children} />
      </div>
      <div className="flex-[2] flex flex-col min-w-0 min-h-0">
        <MissedColumn children={children} />
      </div>
    </div>
  )
}


// ─── Transactions Column ────────────────────────────────────────────────────

function TransactionsColumn({ children }) {
  const [page, setPage] = useState(1)
  const [sources, setSources] = useState([])
  const [childId, setChildId] = useState(null)
  const [showFilter, setShowFilter] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', 'household', page, sources, childId],
    queryFn: () => getHouseholdTransactions({
      page, limit: 10,
      ...(sources.length ? { source: sources.join(',') } : {}),
      ...(childId ? { child_id: childId } : {})
    })
  })

  const transactions = data?.data ?? []
  const { totalPages = 1, total = 0 } = data?.pagination ?? {}
  const hasFilters = sources.length > 0 || !!childId

  const clearFilters = () => { setSources([]); setChildId(null); setPage(1) }
  const handleChildSelect = (id) => { setChildId(prev => prev === id ? null : id); setPage(1) }
  const handleSourceSelect = (id) => {
    setSources(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
    setPage(1)
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setShowFilter(true)} className="relative active:opacity-70">
          <span className="text-lg">🔍</span>
          {hasFilters && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-400 rounded-full" />}
        </button>
        <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider">
          Transactions ({total})
        </h2>
      </div>

      {isLoading ? null : transactions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-white/40">
          <p>No transactions to show.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-y-auto scrollbar-hide">
          {transactions.map(tx => <TransactionRow key={tx.id} tx={tx} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 pt-4 pb-2 shrink-0">
          <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
            className="text-base font-medium text-white/70 bg-white/10 disabled:opacity-30 active:bg-white/20 px-5 py-2.5 rounded-xl">
            ← Prev
          </button>
          <span className="text-lg font-medium text-white/40">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
            className="text-base font-medium text-white/70 bg-white/10 disabled:opacity-30 active:bg-white/20 px-5 py-2.5 rounded-xl">
            Next →
          </button>
        </div>
      )}

      <FilterPanel
        show={showFilter}
        onClose={() => setShowFilter(false)}
        side="left"
        title="Transaction Filters"
        children={children}
        selectedChildId={childId}
        onChildSelect={handleChildSelect}
        sources={SOURCES}
        selectedSources={sources}
        onSourceSelect={handleSourceSelect}
        hasActiveFilters={hasFilters}
        onClear={clearFilters}
      />
    </>
  )
}


// ─── Missed Chores Column ───────────────────────────────────────────────────

function MissedColumn({ children }) {
  const [page, setPage] = useState(1)
  const [childId, setChildId] = useState(null)
  const [showFilter, setShowFilter] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['assignments', 'missed', page, childId],
    queryFn: () => getMissedAssignments({
      page, limit: 10,
      ...(childId ? { child_id: childId } : {})
    })
  })

  const items = data?.data ?? []
  const { totalPages = 1, total = 0 } = data?.pagination ?? {}
  const hasFilters = !!childId

  const clearFilters = () => { setChildId(null); setPage(1) }
  const handleChildSelect = (id) => { setChildId(prev => prev === id ? null : id); setPage(1) }

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider flex-1">
          Missed Chores ({total})
        </h2>
        <button onClick={() => setShowFilter(true)} className="relative active:opacity-70">
          <span className="text-lg">🔍</span>
          {hasFilters && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-400 rounded-full" />}
        </button>
      </div>

      {isLoading ? null : items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-white/40">
          <p>No missed chores.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-y-auto scrollbar-hide">
          {items.map(item => <MissedRow key={item.id} item={item} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 pt-4 pb-2 shrink-0">
          <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
            className="text-base font-medium text-white/70 bg-white/10 disabled:opacity-30 active:bg-white/20 px-5 py-2.5 rounded-xl">
            ← Prev
          </button>
          <span className="text-lg font-medium text-white/40">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
            className="text-base font-medium text-white/70 bg-white/10 disabled:opacity-30 active:bg-white/20 px-5 py-2.5 rounded-xl">
            Next →
          </button>
        </div>
      )}

      <FilterPanel
        show={showFilter}
        onClose={() => setShowFilter(false)}
        side="right"
        title="Missed Chore Filters"
        children={children}
        selectedChildId={childId}
        onChildSelect={handleChildSelect}
        sources={null}
        selectedSources={[]}
        onSourceSelect={null}
        hasActiveFilters={hasFilters}
        onClear={clearFilters}
      />
    </>
  )
}


// ─── Filter Panel (slide-in) ────────────────────────────────────────────────

function FilterPanel({
  show, onClose, side, title,
  children, selectedChildId, onChildSelect,
  sources, selectedSources, onSourceSelect,
  hasActiveFilters, onClear
}) {
  return (
    <div className={`fixed inset-0 z-50 ${show ? '' : 'pointer-events-none'}`}>
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div className={`absolute ${side === 'left' ? 'left-0' : 'right-0'}
        w-72 bg-slate-800 p-5 flex flex-col rounded-xl
        transform transition-transform duration-300
        ${show ? 'translate-x-0' : side === 'left' ? '-translate-x-full' : 'translate-x-full'}`}
        style={{ top: '7rem', bottom: '1.5rem' }}
      >
        {/* Header */}
        <div className={`flex items-center ${side === 'left' ? 'justify-between' : 'flex-row-reverse justify-between'} mb-6`}>
          <span className="font-semibold">{title}</span>
          <button onClick={onClose} className="text-white/50 active:text-white/80 text-lg">✕</button>
        </div>

        {/* Children */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Children</span>
          {children.map(child => (
            <button
              key={child.id}
              onClick={() => onChildSelect(child.id)}
              className={`flex items-center gap-3 py-3 px-2 rounded-lg active:bg-white/15 transition-colors
                ${selectedChildId === child.id ? 'bg-white/10' : ''}`}
            >
              <img
                src={buildAvatarSrc(child.avatar)}
                alt={child.nick_name || child.name}
                className={`w-10 h-10 rounded-full transition-shadow
                  ${selectedChildId === child.id ? 'ring-2 ring-indigo-400' : ''}`}
              />
              <span className="text-sm font-medium">{child.nick_name || child.name}</span>
            </button>
          ))}
        </div>

        {/* Source (transactions only) */}
        {sources && (
          <div className="flex flex-col gap-1 mt-6">
            <span className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Source</span>
            {sources.map(s => (
              <button
                key={s.id}
                onClick={() => onSourceSelect(s.id)}
                className={`flex items-center gap-3 py-3 px-2 rounded-lg active:bg-white/15 transition-colors
                  ${selectedSources.includes(s.id) ? 'bg-white/10' : ''}`}
              >
                <span className="text-base">{s.emoji}</span>
                <span className="text-sm font-medium">{s.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Clear Filters */}
        <div className="mt-auto pt-4">
          <button
            onClick={() => { onClear(); onClose() }}
            className={`w-full py-2.5 rounded-xl text-sm font-medium bg-white/10 active:bg-white/20
              ${hasActiveFilters ? '' : 'invisible'}`}
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  )
}


// ─── Transaction Row ────────────────────────────────────────────────────────

function TransactionRow({ tx }) {
  return (
    <div className="flex items-center gap-3 px-4 py-4 bg-white/15 rounded-xl border border-transparent">
      <span className="text-2xl shrink-0">{SOURCE_EMOJI[tx.source]}</span>
      <span className="text-xl font-semibold truncate min-w-0">{tx.reference_title ?? SOURCE_LABELS[tx.source]}</span>
      <span className="text-lg font-medium text-white/50 shrink-0">{new Date(tx.created_at).toLocaleDateString()}</span>
      <div className="ml-auto flex items-center gap-3 shrink-0">
        {tx.child_name && (
          <span className="text-lg font-medium text-white/50">{tx.child_name}</span>
        )}
        {tx.child_avatar && (
          <img src={buildAvatarSrc(tx.child_avatar)} alt={tx.child_name} className="w-8 h-8 rounded-full" />
        )}
        <span className={`text-lg font-semibold ml-1 ${TX_COLORS[tx.source] ?? 'text-white/60'}`}>
          {tx.amount > 0 ? '+' : ''}{tx.amount} pts
        </span>
      </div>
    </div>
  )
}


// ─── Missed Row ─────────────────────────────────────────────────────────────

function MissedRow({ item }) {
  return (
    <div className="flex items-center gap-3 px-4 py-4 bg-red-600/10 border border-red-500/20 rounded-xl">
      <span className="text-2xl shrink-0">{item.emoji}</span>
      <span className="text-xl font-semibold truncate min-w-0">{item.chore_title}</span>
      <span className="text-lg font-medium text-white/50 shrink-0">{new Date(item.assigned_at).toLocaleDateString()}</span>
      <div className="ml-auto flex items-center gap-3 shrink-0">
        {item.child_name && (
          <span className="text-lg font-medium text-white/50">{item.child_name}</span>
        )}
        {item.child_avatar && (
          <img src={buildAvatarSrc(item.child_avatar)} alt={item.child_name} className="w-8 h-8 rounded-full" />
        )}
      </div>
    </div>
  )
}

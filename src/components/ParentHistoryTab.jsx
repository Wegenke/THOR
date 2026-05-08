import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { buildAvatarSrc } from '../utils/avatar'
import { getProfiles } from '../api/auth'
import { getHouseholdTransactions } from '../api/transactions'
import { getMissedAssignments } from '../api/assignments'
import { useKboard } from '../hooks/useKboard'
import FilterPanel, { FilterSection, FilterOption } from './FilterPanel'
import HistoryDetailModal from './HistoryDetailModal'


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

export default function ParentHistoryTab({ txChildId, setTxChildId, missedChildId, setMissedChildId }) {
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: getProfiles
  })

  const children = profiles.filter(p => p.role === 'child')

  return (
    <div className="flex gap-4 h-full">
      <div className="flex-[5] flex flex-col min-w-0 min-h-0">
        <TransactionsColumn children={children} childId={txChildId} setChildId={setTxChildId} />
      </div>
      <div className="flex-[4] flex flex-col min-w-0 min-h-0">
        <MissedColumn children={children} childId={missedChildId} setChildId={setMissedChildId} />
      </div>
    </div>
  )
}


// ─── Transactions Column ────────────────────────────────────────────────────

function TransactionsColumn({ children, childId, setChildId }) {
  const [page, setPage] = useState(1)
  const [sources, setSources] = useState([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchKb = useKboard(search, setSearch)
  const [showFilter, setShowFilter] = useState(false)
  const [detailItem, setDetailItem] = useState(null)

  useEffect(() => {
    if (search === debouncedSearch) return
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [search, debouncedSearch])

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', 'household', page, sources, childId, debouncedSearch],
    queryFn: () => getHouseholdTransactions({
      page, limit: 10,
      ...(sources.length ? { source: sources.join(',') } : {}),
      ...(childId ? { child_id: childId } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {})
    })
  })

  const transactions = data?.data ?? []
  const { totalPages = 1, total = 0 } = data?.pagination ?? {}
  const hasFilters = sources.length > 0 || !!childId || !!debouncedSearch

  const clearFilters = () => { setSources([]); setChildId(null); setSearch(''); setPage(1) }
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
          {transactions.map(tx => <TransactionRow key={tx.id} tx={tx} onClick={() => setDetailItem(tx)} />)}
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
        hasActiveFilters={hasFilters}
        onClear={clearFilters}
      >
        <FilterSection title="Search">
          <input
            type="text"
            inputMode="none"
            value={search}
            {...searchKb}
            placeholder="title, reward, reason…"
            className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-white/30 placeholder:text-white/30"
          />
        </FilterSection>
        <FilterSection title="Children">
          {children.map(child => (
            <FilterOption key={child.id} active={childId === child.id} onClick={() => handleChildSelect(child.id)}>
              <img
                src={buildAvatarSrc(child.avatar)}
                alt={child.nick_name || child.name}
                className={`w-10 h-10 rounded-full transition-shadow ${childId === child.id ? 'ring-2 ring-indigo-400' : ''}`}
              />
              <span className="text-sm font-medium">{child.nick_name || child.name}</span>
            </FilterOption>
          ))}
        </FilterSection>
        <FilterSection title="Source">
          {SOURCES.map(s => (
            <FilterOption key={s.id} active={sources.includes(s.id)} onClick={() => handleSourceSelect(s.id)}>
              <span className="text-base">{s.emoji}</span>
              <span className="text-sm font-medium">{s.label}</span>
            </FilterOption>
          ))}
        </FilterSection>
      </FilterPanel>

      {detailItem && (
        <HistoryDetailModal item={detailItem} kind="transaction" onClose={() => setDetailItem(null)} />
      )}
    </>
  )
}


// ─── Missed Chores Column ───────────────────────────────────────────────────

function MissedColumn({ children, childId, setChildId }) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchKb = useKboard(search, setSearch)
  const [showFilter, setShowFilter] = useState(false)
  const [detailItem, setDetailItem] = useState(null)

  useEffect(() => {
    if (search === debouncedSearch) return
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [search, debouncedSearch])

  const { data, isLoading } = useQuery({
    queryKey: ['assignments', 'missed', page, childId, debouncedSearch],
    queryFn: () => getMissedAssignments({
      page, limit: 10,
      ...(childId ? { child_id: childId } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {})
    })
  })

  const items = data?.data ?? []
  const { totalPages = 1, total = 0 } = data?.pagination ?? {}
  const hasFilters = !!childId || !!debouncedSearch

  const clearFilters = () => { setChildId(null); setSearch(''); setPage(1) }
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
          {items.map(item => <MissedRow key={item.id} item={item} onClick={() => setDetailItem(item)} />)}
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
        hasActiveFilters={hasFilters}
        onClear={clearFilters}
      >
        <FilterSection title="Search">
          <input
            type="text"
            inputMode="none"
            value={search}
            {...searchKb}
            placeholder="chore title…"
            className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-white/30 placeholder:text-white/30"
          />
        </FilterSection>
        <FilterSection title="Children">
          {children.map(child => (
            <FilterOption key={child.id} active={childId === child.id} onClick={() => handleChildSelect(child.id)}>
              <img
                src={buildAvatarSrc(child.avatar)}
                alt={child.nick_name || child.name}
                className={`w-10 h-10 rounded-full transition-shadow ${childId === child.id ? 'ring-2 ring-indigo-400' : ''}`}
              />
              <span className="text-sm font-medium">{child.nick_name || child.name}</span>
            </FilterOption>
          ))}
        </FilterSection>
      </FilterPanel>

      {detailItem && (
        <HistoryDetailModal item={detailItem} kind="missed" onClose={() => setDetailItem(null)} />
      )}
    </>
  )
}




// ─── Transaction Row ────────────────────────────────────────────────────────

function TransactionRow({ tx, onClick }) {
  return (
    <div onClick={onClick} className="flex items-center gap-3 px-4 py-4 bg-white/15 rounded-xl border border-transparent cursor-pointer active:bg-white/20">
      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-lg font-semibold ${TX_COLORS[tx.source] ?? 'text-white/60'}`}>
          {tx.amount > 0 ? '+' : ''}{tx.amount} pts
        </span>
        {tx.child_avatar && (
          <img src={buildAvatarSrc(tx.child_avatar)} alt={tx.child_name} className="w-8 h-8 rounded-full" />
        )}
        {tx.child_name && (
          <span className="text-lg font-medium text-white/50">{tx.child_name}</span>
        )}
      </div>
      <span className="text-lg font-medium text-white/50 shrink-0">{new Date(tx.created_at).toLocaleDateString()}</span>
      <span className="text-xl font-semibold truncate min-w-0 flex-1 text-right">{tx.reference_title ?? SOURCE_LABELS[tx.source]}</span>
      <span className="text-2xl shrink-0">{SOURCE_EMOJI[tx.source]}</span>
    </div>
  )
}


// ─── Missed Row ─────────────────────────────────────────────────────────────

function MissedRow({ item, onClick }) {
  const isOverdue = item.status === 'assigned'
  return (
    <div onClick={onClick} className={`flex items-center gap-3 px-4 py-4 rounded-xl cursor-pointer active:opacity-80 ${
      isOverdue
        ? 'bg-amber-600/10 border border-amber-500/30'
        : 'bg-red-600/10 border border-red-500/20'
    }`}>
      <span className="text-2xl shrink-0">{item.emoji}</span>
      <span className="text-xl font-semibold truncate min-w-0">{item.chore_title}</span>
      {isOverdue && (
        <span className="px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 text-xs shrink-0">Overdue</span>
      )}
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

import { useState } from "react"
import { useQuery } from '@tanstack/react-query'
import { getMyTransactions } from "../api/transactions"


const TX_COLORS = {
  chore_approved: 'text-green-400',
  reward_contribution: 'text-red-400',
  reward_refund: 'text-amber-400'
}

const SOURCE_EMOJI = {
  chore_approved: '✅',
  reward_contribution: '🎁',
  reward_refund: '↩️'
}

export default function HistoryTab() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery({
    queryKey: ['transactions', 'mine', page],
    queryFn: () => getMyTransactions({ page })
  })

  if (isLoading) return null

  const transactions = data?.data ?? []
  const { totalPages } = data?.pagination ?? { totalPages: 1 }

  const SOURCE_LABELS = {
    chore_approved: 'Chore approved',
    reward_contribution: 'Reward contribution',
    reward_refund: 'Reward refund'
  }

  if (transactions.length === 0) return (
    <div className="flex items-center justify-center h-48 text-white/40">
      <p>No transaction history yet.</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-2 max-w-lg mx-auto">
      {transactions.map(tx => (
        <div key={tx.id} className="flex items-center justify-between px-5 py-5 bg-white/15 rounded-xl">
          <div className="flex items-start gap-2 min-w-0">
            <span className="text-base shrink-0">{SOURCE_EMOJI[tx.source]}</span>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm font-medium truncate">{tx.reference_title ?? SOURCE_LABELS[tx.source]}</span>
              <span className="text-xs text-white/40">{new Date(tx.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <span className={`font-semibold ${TX_COLORS[tx.source] ?? 'text-white/60'}`}>
            {tx.amount > 0 ? '+' : ''}{tx.amount} pts
          </span>
        </div>
      ))}

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
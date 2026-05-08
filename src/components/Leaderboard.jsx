import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { buildAvatarSrc } from '../utils/avatar'
import { getLeaderboard } from '../api/dashboard'

const BUCKETS = [
  { id: 'today',     label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week',      label: 'Week' },
  { id: 'month',     label: 'Month' }
]

const MEDALS = ['🥇', '🥈', '🥉']

export default function Leaderboard({ currentUserId }) {
  const [bucket, setBucket] = useState('today')

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['dashboard', 'leaderboard'],
    queryFn: getLeaderboard
  })

  if (isLoading || rows.length === 0) return null

  const sorted = [...rows].sort((a, b) => (b[bucket] ?? 0) - (a[bucket] ?? 0))

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1">
        🏆 Leaderboard
      </h2>
      <div className="bg-gradient-to-br from-indigo-500/20 to-purple-600/15 border border-indigo-400/20 rounded-xl p-3 flex flex-col gap-2 min-h-0">
      <div className="flex gap-1">
        {BUCKETS.map(b => (
          <button
            key={b.id}
            onClick={() => setBucket(b.id)}
            className={`flex-1 text-xs py-1.5 rounded-lg active:opacity-80 ${
              bucket === b.id ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50'
            }`}
          >{b.label}</button>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        {sorted.map((c, i) => {
          const isMe = c.id === currentUserId
          return (
            <div
              key={c.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${isMe ? 'bg-indigo-400/50 ring-2 ring-indigo-300/60' : ''}`}
            >
              <span className="text-base w-6 text-center shrink-0">{MEDALS[i] ?? `${i + 1}`}</span>
              <img src={buildAvatarSrc(c.avatar)} alt={c.name} className="w-8 h-8 rounded-full shrink-0" />
              <span className="flex-1 text-sm truncate">{c.nick_name || c.name}</span>
              <span className="text-sm font-semibold whitespace-nowrap">{c[bucket] ?? 0} pts</span>
            </div>
          )
        })}
      </div>
      </div>
    </section>
  )
}

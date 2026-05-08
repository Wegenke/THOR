import { useQuery } from '@tanstack/react-query'
import { getChildStats } from '../api/dashboard'

export default function StatsBlock({ childId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'stats', childId],
    queryFn: () => getChildStats(childId),
    enabled: !!childId
  })

  if (isLoading || !data) return null

  const { completed = 0, missed = 0, points_earned = 0, points_missed = 0, streak } = data
  const streakDays = streak?.days ?? 0
  const streakType = streak?.type ?? 'clean'

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1">
        📊 Stats — last 7 days
      </h2>
      <div className="bg-white/10 rounded-xl p-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <StatCell label="Completed" value={completed} tone="positive" />
          <StatCell label="Missed" value={missed} tone="negative" />
          <StatCell label="Points Earned" value={`${points_earned} pts`} tone="positive" />
          <StatCell label="Points Missed" value={`${points_missed} pts`} tone="negative" />
        </div>
        {streakDays > 0 && (
          <div className={`text-center text-sm font-medium rounded-lg py-2 ${
            streakType === 'clean'
              ? 'bg-amber-500/15 text-amber-300'
              : 'bg-red-500/15 text-red-300'
          }`}>
            {streakType === 'clean' ? '🔥' : '⚠️'} {streakDays} day{streakDays === 1 ? '' : 's'} {streakType === 'clean' ? 'clean' : 'missed'} streak
          </div>
        )}
      </div>
    </section>
  )
}

function StatCell({ label, value, tone }) {
  const valueColor = tone === 'positive' ? 'text-green-400' : 'text-red-400'
  return (
    <div className="bg-white/5 rounded-lg px-3 py-2 flex flex-col items-center gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-white/40">{label}</span>
      <span className={`text-xl font-bold ${valueColor}`}>{value}</span>
    </div>
  )
}

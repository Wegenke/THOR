import { useState } from 'react'
import { buildAvatarSrc } from '../utils/avatar'
import AdjustPointsModal from './AdjustPointsModal'
import ViewAsChildModal from './ViewAsChildModal'

export default function ChildSummaryCard({ child }) {
  const avatarSrc = buildAvatarSrc(child.avatar)
  const [showAdjust, setShowAdjust] = useState(false)
  const [showView, setShowView] = useState(false)

  const counts = child.assignment_counts || {}
  const active = (counts.in_progress || 0) + (counts.paused || 0) + (counts.parent_paused || 0)
  const assigned = counts.assigned || 0
  const submitted = counts.submitted || 0
  const rejected = counts.rejected || 0

  return (
    <>
      <div className="flex flex-col gap-2 bg-white/15 rounded-xl px-4 py-3">

        <button className="flex items-center gap-3 text-left active:opacity-70" onClick={() => setShowView(true)}>
          <img src={avatarSrc} alt={child.name} className="w-10 h-10 rounded-full" />
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{child.nick_name || child.name}</div>
          </div>
          <span className="text-xl font-semibold text-white/70 whitespace-nowrap">
            {child.points_balance} pts
          </span>
        </button>

        {(assigned > 0 || active > 0 || submitted > 0 || rejected > 0) && (
          <div className="flex gap-1.5 flex-wrap">
            {assigned > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/60 text-xs">{assigned} assigned</span>
            )}
            {active > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs">{active} active</span>
            )}
            {submitted > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-xs">{submitted} submitted</span>
            )}
            {rejected > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-xs">{rejected} rejected</span>
            )}
          </div>
        )}

        <button
          onClick={() => setShowAdjust(true)}
          className="py-1.5 rounded-lg bg-white/5 text-xs text-white/40 font-medium active:bg-white/10"
        >Adjust Points</button>

      </div>

      {showAdjust && (
        <AdjustPointsModal child={child} onClose={() => setShowAdjust(false)} />
      )}
      {showView && (
        <ViewAsChildModal child={child} onClose={() => setShowView(false)} />
      )}
    </>
  )
}

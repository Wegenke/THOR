import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { buildAvatarSrc } from '../utils/avatar'
import { cancelAssignment, parentStartAssignment, unstartAssignment, parentPauseAssignment, reassignAssignment, unassignAssignment } from '../api/assignments'

const STATUS_LABELS = {
  unassigned: 'Unassigned',
  assigned: 'Assigned',
  in_progress: 'In progress',
  paused: 'Paused',
  parent_paused: 'Paused by parent',
  submitted: 'Submitted',
  rejected: 'Rejected',
  approved: 'Approved',
  dismissed: 'Dismissed',
  cancelled: 'Cancelled'
}

export default function AssignmentRow({ assignment, children }) {
  const [expanded, setExpanded] = useState(false)
  const cardRef = useRef(null)
  const queryClient = useQueryClient()
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['assignments'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'parent'] })
  }

  const collapse = () => setExpanded(false)
  const parentStart = useMutation({ mutationFn: () => parentStartAssignment(assignment.id), onSuccess: invalidate })
  const unstart = useMutation({ mutationFn: () => unstartAssignment(assignment.id), onSuccess: invalidate })
  const cancel = useMutation({ mutationFn: () => cancelAssignment(assignment.id), onSuccess: invalidate })
  const parentPause = useMutation({ mutationFn: () => parentPauseAssignment(assignment.id), onSuccess: invalidate })
  const reassign = useMutation({
    mutationFn: (child_id) => reassignAssignment(assignment.id, child_id),
    onSuccess: invalidate
  })
  const unassign = useMutation({ mutationFn: () => unassignAssignment(assignment.id), onSuccess: invalidate })

  const busy = parentStart.isPending || unstart.isPending || cancel.isPending || parentPause.isPending || reassign.isPending || unassign.isPending
  const { status, chore_title, emoji, points, child_name, child_avatar } = assignment

  const canStart = status === 'assigned'
  const canUnstart = ['in_progress', 'paused', 'parent_paused'].includes(status)
  const canCancel = ['assigned', 'rejected'].includes(status)
  const canPause = status === 'in_progress'
  const canReassign = ['assigned', 'rejected'].includes(status)
  const canUnassign = ['assigned', 'rejected', 'paused', 'parent_paused'].includes(status)

  useEffect(() => {
    if (expanded) cardRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [expanded])

  return (
    <div ref={cardRef} className="bg-white/15 rounded-xl px-4 py-3 flex flex-col gap-2">
      <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {child_avatar ? (
          <img
            src={buildAvatarSrc(child_avatar)}
            alt={child_name}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/30 text-sm border-3 border-dashed border-red-500/40">?</div>
        )}
        <span className="text-xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm leading-tight truncate">{chore_title}</div>
          <div className="text-white/50 text-xs mt-0.5">
            {child_name || 'Unassigned'} · {STATUS_LABELS[status] ?? status}
          </div>
        </div>
        <div className="text-white/70 text-sm whitespace-nowrap">{points} pts</div>
      </div>
      {expanded && (
        <div className="flex gap-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => { collapse(); parentStart.mutate() }}
            disabled={!canStart || busy}
            className="px-3 py-1.5 rounded-lg bg-green-600/80 text-xs font-medium disabled:opacity-30 active:bg-green-600"
          >
            Start
          </button>
          <button
            onClick={() => { collapse(); parentPause.mutate() }}
            disabled={!canPause || busy}
            className="px-3 py-1.5 rounded-lg bg-orange-600/80 text-xs font-medium disabled:opacity-30 active:bg-orange-600"
          >
            Pause
          </button>
          <button
            onClick={() => { collapse(); unstart.mutate() }}
            disabled={!canUnstart || busy}
            className="px-3 py-1.5 rounded-lg bg-yellow-600/80 text-xs font-medium disabled:opacity-30 active:bg-yellow-600"
          >
            Un-start
          </button>
          {children.filter(c => String(c.id) !== String(assignment.child_id)).map(child => (
            <button
              key={child.id}
              onClick={() => { collapse(); reassign.mutate(child.id) }}
              disabled={!canReassign || busy}
              className="px-3 py-1.5 rounded-lg bg-blue-600/80 text-xs font-medium disabled:opacity-30 active:bg-blue-600"
            >
              → {child.name}
            </button>
          ))}
          <button
            onClick={() => { collapse(); unassign.mutate() }}
            disabled={!canUnassign || busy}
            className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-medium disabled:opacity-30 active:bg-white/20"
          >
            → Pool
          </button>
          <button
            onClick={() => { collapse(); cancel.mutate() }}
            disabled={!canCancel || busy}
            className="px-3 py-1.5 rounded-lg bg-red-600/80 text-xs font-medium disabled:opacity-30 active:bg-red-600"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

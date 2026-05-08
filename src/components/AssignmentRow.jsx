import { useState } from 'react'
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

const STATUS_PILL = {
  assigned: 'bg-white/10 text-white/70',
  in_progress: 'bg-green-500/20 text-green-300',
  paused: 'bg-orange-500/20 text-orange-300',
  parent_paused: 'bg-orange-500/20 text-orange-300',
  submitted: 'bg-cyan-500/20 text-cyan-300',
  rejected: 'bg-red-500/20 text-red-300'
}

export default function AssignmentRow({ assignment, children }) {
  const [showModal, setShowModal] = useState(false)
  const { status, chore_title, emoji, points, child_name, child_avatar } = assignment

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        className="bg-white/15 rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer active:bg-white/20"
      >
        {child_avatar ? (
          <img src={buildAvatarSrc(child_avatar)} alt={child_name} className="w-8 h-8 rounded-full" />
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

      {showModal && (
        <AssignmentActionsModal
          assignment={assignment}
          children={children}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}


function AssignmentActionsModal({ assignment, children, onClose }) {
  const queryClient = useQueryClient()
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['assignments'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'parent'] })
  }
  const closeAndInvalidate = () => { invalidate(); onClose() }

  const parentStart = useMutation({ mutationFn: () => parentStartAssignment(assignment.id), onSuccess: closeAndInvalidate })
  const unstart = useMutation({ mutationFn: () => unstartAssignment(assignment.id), onSuccess: closeAndInvalidate })
  const cancel = useMutation({ mutationFn: () => cancelAssignment(assignment.id), onSuccess: closeAndInvalidate })
  const parentPause = useMutation({ mutationFn: () => parentPauseAssignment(assignment.id), onSuccess: closeAndInvalidate })
  const reassign = useMutation({
    mutationFn: (child_id) => reassignAssignment(assignment.id, child_id),
    onSuccess: closeAndInvalidate
  })
  const unassign = useMutation({ mutationFn: () => unassignAssignment(assignment.id), onSuccess: closeAndInvalidate })

  const busy = parentStart.isPending || unstart.isPending || cancel.isPending || parentPause.isPending || reassign.isPending || unassign.isPending
  const { status, chore_title, emoji, points, child_name, child_avatar } = assignment

  const canStart = status === 'assigned'
  const canUnstart = ['in_progress', 'paused', 'parent_paused'].includes(status)
  const canCancel = ['assigned', 'rejected'].includes(status)
  const canPause = status === 'in_progress'
  const canReassign = ['assigned', 'rejected'].includes(status)
  const canUnassign = ['assigned', 'rejected', 'paused', 'parent_paused'].includes(status)

  const reassignTargets = children.filter(c => String(c.id) !== String(assignment.child_id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[28rem] bg-slate-800 rounded-2xl p-5 flex flex-col gap-4" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl shrink-0">{emoji}</span>
            <span className="font-semibold truncate">{chore_title}</span>
          </div>
          <button onClick={onClose} className="text-white/50 active:text-white/80 text-lg shrink-0">✕</button>
        </div>

        <div className="flex items-center gap-3">
          {child_avatar ? (
            <img src={buildAvatarSrc(child_avatar)} alt={child_name} className="w-10 h-10 rounded-full" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/40">?</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm">{child_name || 'Unassigned'}</div>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${STATUS_PILL[status] ?? 'bg-white/10 text-white/70'}`}>
              {STATUS_LABELS[status] ?? status}
            </span>
          </div>
          <span className="text-white font-semibold whitespace-nowrap">{points} pts</span>
        </div>

        {/* Lifecycle actions */}
        <div className="flex gap-2">
          <button
            onClick={() => parentStart.mutate()}
            disabled={!canStart || busy}
            className="flex-1 py-2.5 rounded-xl bg-green-600/80 text-sm font-medium disabled:opacity-30 active:bg-green-600"
          >Start</button>
          <button
            onClick={() => parentPause.mutate()}
            disabled={!canPause || busy}
            className="flex-1 py-2.5 rounded-xl bg-orange-600/80 text-sm font-medium disabled:opacity-30 active:bg-orange-600"
          >Pause</button>
          <button
            onClick={() => unstart.mutate()}
            disabled={!canUnstart || busy}
            className="flex-1 py-2.5 rounded-xl bg-yellow-600/80 text-sm font-medium disabled:opacity-30 active:bg-yellow-600"
          >Un-start</button>
        </div>

        {/* Reassign */}
        {reassignTargets.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Reassign</span>
            <div className="flex gap-2 flex-wrap">
              {reassignTargets.map(child => (
                <button
                  key={child.id}
                  onClick={() => reassign.mutate(child.id)}
                  disabled={!canReassign || busy}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600/80 text-sm font-medium disabled:opacity-30 active:bg-blue-600"
                >
                  <img src={buildAvatarSrc(child.avatar)} alt={child.name} className="w-6 h-6 rounded-full" />
                  → {child.nick_name || child.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Other */}
        <div className="flex gap-2">
          <button
            onClick={() => unassign.mutate()}
            disabled={!canUnassign || busy}
            className="flex-1 py-2.5 rounded-xl bg-white/10 text-sm font-medium disabled:opacity-30 active:bg-white/20"
          >→ Pool</button>
          <button
            onClick={() => cancel.mutate()}
            disabled={!canCancel || busy}
            className="flex-1 py-2.5 rounded-xl bg-red-600/80 text-sm font-medium disabled:opacity-30 active:bg-red-600"
          >Cancel</button>
        </div>

      </div>
    </div>
  )
}

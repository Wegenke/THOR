import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  startAssignment,
  submitAssignment,
  resumeAssignment,
  resumeRejectedAssignment
} from '../api/assignments'

const STATUS_LABELS = {
  assigned: 'Ready to start',
  in_progress: 'In progress',
  paused: 'Paused',
  parent_paused: 'Paused by parent',
  submitted: 'Waiting for review',
  rejected: 'Rejected — needs attention'
}

export default function SlimChoreCard({ assignment }) {
  const queryClient = useQueryClient()
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'child'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'child', 'summary'] })
  }

  const start = useMutation({ mutationFn: () => startAssignment(assignment.id), onSuccess: invalidate })
  const submit = useMutation({ mutationFn: () => submitAssignment(assignment.id), onSuccess: invalidate })
  const resume = useMutation({ mutationFn: () => resumeAssignment(assignment.id), onSuccess: invalidate })
  const resumeRejected = useMutation({ mutationFn: () => resumeRejectedAssignment(assignment.id), onSuccess: invalidate })

  const busy = start.isPending || submit.isPending || resume.isPending || resumeRejected.isPending

  const { status, chore_title, emoji, points } = assignment

  let action = null
  if (status === 'assigned') {
    action = (
      <button onPointerDown={() => start.mutate()} disabled={busy}
        className="px-4 py-2 rounded-lg bg-green-600/80 text-sm font-medium disabled:opacity-40 active:bg-green-600 shrink-0">
        Start
      </button>
    )
  } else if (status === 'in_progress' || status === 'paused') {
    action = (
      <button onPointerDown={() => status === 'paused' ? resume.mutate() : submit.mutate()} disabled={busy}
        className="px-4 py-2 rounded-lg bg-green-600/80 text-sm font-medium disabled:opacity-40 active:bg-green-600 shrink-0">
        {status === 'paused' ? 'Resume' : 'Submit'}
      </button>
    )
  } else if (status === 'rejected') {
    action = (
      <button onPointerDown={() => resumeRejected.mutate()} disabled={busy}
        className="px-4 py-2 rounded-lg bg-yellow-600/80 text-sm font-medium disabled:opacity-40 active:bg-yellow-600 shrink-0">
        Resume
      </button>
    )
  } else if (status === 'submitted') {
    action = <span className="px-3 py-2 rounded-lg bg-white/5 text-xs text-white/40 shrink-0">Waiting…</span>
  } else if (status === 'parent_paused') {
    action = <span className="px-3 py-2 rounded-lg bg-orange-600/30 text-xs text-orange-200 shrink-0">Paused — see My Chores</span>
  }

  return (
    <div className="bg-white/15 rounded-xl p-3 flex items-center gap-3">
      <span className="text-2xl shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{chore_title}</div>
        <div className="text-xs text-white/50 mt-0.5">{STATUS_LABELS[status] ?? status}</div>
      </div>
      <span className="text-sm font-semibold text-white/80 shrink-0">{points} pts</span>
      {action}
    </div>
  )
}

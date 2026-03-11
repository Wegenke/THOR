import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  startAssignment,
  submitAssignment,
  pauseAssignment,
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

export default function ChoreCard({ assignment }) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dashboard', 'child'] })

  const start = useMutation({ mutationFn: () => startAssignment(assignment.id), onSuccess: invalidate })
  const submit = useMutation({ mutationFn: () => submitAssignment(assignment.id), onSuccess: invalidate })
  const pause = useMutation({ mutationFn: () => pauseAssignment(assignment.id), onSuccess: invalidate })
  const resume = useMutation({ mutationFn: () => resumeAssignment(assignment.id), onSuccess: invalidate })
  const resumeRejected = useMutation({ mutationFn: () => resumeRejectedAssignment(assignment.id), onSuccess: invalidate })

  const busy = start.isPending || submit.isPending || pause.isPending || resume.isPending || resumeRejected.isPending

  const { status, chore_title, emoji, points } = assignment

  return (
    <div className="bg-white/10 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2 px-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{emoji}</span>
          <div>
            <div className="font-semibold text-lg leading-tight">{chore_title}</div>
            <div className="text-white/50 text-sm mt-0.5">{STATUS_LABELS[status] ?? status}</div>
          </div>
        </div>
        <div className="text-white text-base font-semibold whitespace-nowrap">{points} pts</div>
      </div>

      <div className="flex gap-2">
        {status === 'assigned' && (
          <button onClick={() => start.mutate()} disabled={busy}
            className="flex-1 py-3 rounded-lg bg-white/10 font-medium disabled:opacity-40 active:bg-white/20">
            Start
          </button>
        )}

        {(status === 'in_progress' || status === 'paused') && (
          <button onClick={() => submit.mutate()} disabled={busy}
            className="flex-1 py-3 rounded-lg bg-green-600/80 font-medium disabled:opacity-40 active:bg-green-600">
            Submit
          </button>
        )}

        {status === 'in_progress' && (
          <button onClick={() => pause.mutate()} disabled={busy}
            className="flex-1 py-3 rounded-lg bg-white/10 font-medium disabled:opacity-40 active:bg-white/20">
            Pause
          </button>
        )}

        {(status === 'paused' || status === 'parent_paused') && (
          <button onClick={() => resume.mutate()} disabled={busy}
            className="flex-1 py-3 rounded-lg bg-white/10 font-medium disabled:opacity-40 active:bg-white/20">
            Resume
          </button>
        )}

        {status === 'rejected' && (
          <button onClick={() => resumeRejected.mutate()} disabled={busy}
            className="flex-1 py-3 rounded-lg bg-yellow-600/80 font-medium disabled:opacity-40 active:bg-yellow-600">
            Resume
          </button>
        )}

        {status === 'submitted' && (
          <div className="flex-1 py-3 rounded-lg bg-white/5 text-center text-white/40 text-sm">
            Waiting for review…
          </div>
        )}
      </div>
    </div>
  )
}

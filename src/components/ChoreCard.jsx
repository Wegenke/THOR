import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import CommentThread from './CommentThread'

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
  const [showComments, setShowComments] = useState(assignment.status === 'rejected')
  useEffect(() => {
    if (assignment.status === 'rejected') setShowComments(true)
  }, [assignment.status])

  const start = useMutation({ mutationFn: () => startAssignment(assignment.id), onSuccess: invalidate })
  const submit = useMutation({ mutationFn: () => submitAssignment(assignment.id), onSuccess: invalidate })
  const pause = useMutation({ mutationFn: () => pauseAssignment(assignment.id), onSuccess: invalidate })
  const resume = useMutation({ mutationFn: () => resumeAssignment(assignment.id), onSuccess: invalidate })
  const resumeRejected = useMutation({ mutationFn: () => resumeRejectedAssignment(assignment.id), onSuccess: invalidate })

  const busy = start.isPending || submit.isPending || pause.isPending || resume.isPending || resumeRejected.isPending

  const [showDescription, setShowDescription] = useState(false)
  const { status, chore_title, emoji, points, description } = assignment

  return (
    <>
      <div className="bg-white/10 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2 px-3">
          <button
            className="flex items-center gap-3 text-left active:opacity-70"
            onClick={() => description && setShowDescription(true)}
          >
            <span className="text-3xl">{emoji}</span>
            <div>
              <div className="font-semibold text-lg leading-tight">{chore_title}</div>
              <div className="text-white/50 text-sm mt-0.5">{STATUS_LABELS[status] ?? status}</div>
            </div>
          </button>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="text-white text-base font-semibold whitespace-nowrap">{points} pts</div>
            <button onClick={() => setShowComments(true)} className="text-xs text-white/40 active:text-white/70">
              💬
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          {status === 'assigned' && (
            <button onClick={() => start.mutate()} disabled={busy}
              className="flex-1 py-3 rounded-lg bg-green-600/80 font-medium disabled:opacity-40 active:bg-green-600">
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
              className="flex-1 py-3 rounded-lg bg-orange-600/80 font-medium disabled:opacity-40 active:bg-orange-600">
              Pause
            </button>
          )}

          {(status === 'paused' || status === 'parent_paused') && (
            <button onClick={() => resume.mutate()} disabled={busy}
              className="flex-1 py-3 rounded-lg bg-yellow-600/80 font-medium disabled:opacity-40 active:bg-yellow-600">
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

      {showDescription && description && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowDescription(false)}>
          <div className="w-[32rem] bg-slate-800 rounded-2xl p-5 flex flex-col gap-3"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{emoji}</span>
                <span className="font-semibold text-lg">{chore_title}</span>
              </div>
              <button onClick={() => setShowDescription(false)} className="text-white/50 active:text-white/80 text-lg">✕</button>
            </div>
            <p className="text-white/70 leading-relaxed">{description}</p>
          </div>
        </div>
      )}

      {showComments && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowComments(false)}>
          <div className="w-[36rem] bg-slate-800 rounded-2xl p-5 flex flex-col gap-3"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="font-semibold">{chore_title}</span>
              <button onClick={() => setShowComments(false)} className="text-white/50 active:text-white/80 text-lg">✕</button>
            </div>
            <CommentThread assignmentId={assignment.id} />
          </div>
        </div>
      )}
    </>
  )
}

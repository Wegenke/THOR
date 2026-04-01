import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { buildAvatarSrc } from '../utils/avatar'
import { approveAssignment, rejectAssignment, dismissAssignment } from '../api/assignments'
import CommentThread from './CommentThread'
import { useKboard } from '../hooks/useKboard'

export default function ApprovalCard({ assignment }) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dashboard', 'parent'] })

  const [rejectMode, setRejectMode] = useState(false)
  const [comment, setComment] = useState('')
  const [showComments, setShowComments] = useState(false)

  const commentKb = useKboard(comment, setComment)

  const approve = useMutation({ mutationFn: () => approveAssignment(assignment.id), onSuccess: invalidate })
  const reject = useMutation({
    mutationFn: () => rejectAssignment(assignment.id, comment),
    onSuccess: () => { invalidate(); setRejectMode(false); setComment('') }
  })
  const dismiss = useMutation({ mutationFn: () => dismissAssignment(assignment.id), onSuccess: invalidate })

  const busy = approve.isPending || reject.isPending || dismiss.isPending

  const submittedAt = new Date(assignment.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const avatarSrc = buildAvatarSrc(assignment.child_avatar)

  return (
    <>
    <div className="bg-white/15 rounded-xl p-4 flex flex-col gap-3">

      <div className="flex items-center gap-3 px-3">
        <span className="text-2xl">{assignment.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold leading-tight truncate">{assignment.chore_title}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-white/50 text-sm">{assignment.child_name} · {submittedAt}</span>
          </div>
        </div>
        <img src={avatarSrc} alt={assignment.child_name} className="w-10 h-10 rounded-full"/>
        <div className="text-white font-semibold whitespace-nowrap">{assignment.points} pts</div>
      </div>

      {rejectMode ? (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            inputMode="none"
            value={comment}
            {...commentKb}
            placeholder="Reason for rejection…"
            className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm placeholder:text-white/30 outline-none"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => reject.mutate()}
              disabled={!comment.trim() || busy}
              className="flex-1 py-2 rounded-lg bg-red-600/80 text-sm font-medium disabled:opacity-40 active:bg-red-600"
            >
              Confirm Reject
            </button>
            <button
              onClick={() => { setRejectMode(false); setComment('') }}
              disabled={busy}
              className="flex-1 py-2 rounded-lg bg-white/10 text-sm font-medium disabled:opacity-40 active:bg-white/20"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => approve.mutate()}
            disabled={busy}
            className="flex-1 py-2 rounded-lg bg-green-600/80 text-sm font-medium disabled:opacity-40 active:bg-green-600"
          >
            Approve
          </button>
          <button
            onClick={() => setRejectMode(true)}
            disabled={busy}
            className="flex-1 py-2 rounded-lg bg-red-600/80 text-sm font-medium disabled:opacity-40 active:bg-red-600"
          >
            Reject
          </button>
          <button
            onClick={() => dismiss.mutate()}
            disabled={busy}
            className="flex-1 py-2 rounded-lg bg-white/10 text-sm font-medium disabled:opacity-40 active:bg-white/20"
          >
            Dismiss
          </button>
          <button
            onClick={() => setShowComments(true)}
            className="flex-1 py-2 rounded-lg bg-white/10 text-sm font-medium active:bg-white/20"
          >
            💬
          </button>
        </div>
      )}

    </div>

    {showComments && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        onClick={() => setShowComments(false)}>
        <div className="w-[36rem] bg-slate-800 rounded-2xl p-5 flex flex-col gap-3"
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <span className="font-semibold">{assignment.chore_title}</span>
            <button onClick={() => setShowComments(false)} className="text-white/50 active:text-white/80 text-lg">✕</button>
          </div>
          <CommentThread assignmentId={assignment.id} />
        </div>
      </div>
    )}
  </>
  )
}

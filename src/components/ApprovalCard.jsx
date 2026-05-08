import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { buildAvatarSrc } from '../utils/avatar'
import { approveAssignment, rejectAssignment, dismissAssignment } from '../api/assignments'
import CommentThread from './CommentThread'
import { useKboard } from '../hooks/useKboard'

export default function ApprovalCard({ assignment }) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dashboard', 'parent'] })

  const [showModal, setShowModal] = useState(false)
  const [pendingApprove, setPendingApprove] = useState(false)
  const [undoCountdown, setUndoCountdown] = useState(0)
  const [autoApproved, setAutoApproved] = useState(false)

  const undoIntervalRef = useRef(null)
  const pendingApproveRef = useRef(false)
  const showModalRef = useRef(false)
  useEffect(() => { showModalRef.current = showModal }, [showModal])

  const approve = useMutation({
    mutationFn: () => approveAssignment(assignment.id),
    onSuccess: () => {
      if (showModalRef.current) setAutoApproved(true)
      else invalidate()
    }
  })

  const startCountdown = (e) => {
    e.stopPropagation()
    setPendingApprove(true)
    pendingApproveRef.current = true
    setUndoCountdown(2)
    undoIntervalRef.current = setInterval(() => setUndoCountdown(prev => prev - 1), 1000)
  }

  const cancelCountdown = (e) => {
    e.stopPropagation()
    setPendingApprove(false)
    pendingApproveRef.current = false
    setUndoCountdown(0)
    clearInterval(undoIntervalRef.current)
  }

  useEffect(() => {
    if (pendingApprove && undoCountdown <= 0) {
      clearInterval(undoIntervalRef.current)
      setPendingApprove(false)
      pendingApproveRef.current = false
      approve.mutate()
    }
  }, [undoCountdown, pendingApprove])

  useEffect(() => {
    return () => {
      clearInterval(undoIntervalRef.current)
      if (pendingApproveRef.current) {
        approveAssignment(assignment.id).then(() => queryClient.invalidateQueries({ queryKey: ['dashboard', 'parent'] }))
      }
    }
  }, [])

  const handleModalClose = () => {
    setShowModal(false)
    if (autoApproved) invalidate()
  }

  const submittedAt = new Date(assignment.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        className="bg-white/15 rounded-xl p-4 flex flex-col gap-3 border-l-4 border-green-400/70 cursor-pointer active:bg-white/20"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-green-400/70">Chore Approval</span>
        <div className="flex items-center gap-3 px-3">
          {pendingApprove ? (
            <button
              onPointerDown={cancelCountdown}
              onClick={e => e.stopPropagation()}
              aria-label={`Undo, ${undoCountdown} seconds`}
              className="w-10 h-10 rounded-lg bg-teal-400/80 active:bg-teal-400 text-slate-900 font-bold text-base flex items-center justify-center shrink-0"
            >
              {undoCountdown}
            </button>
          ) : (
            <button
              onPointerDown={startCountdown}
              onClick={e => e.stopPropagation()}
              disabled={autoApproved}
              aria-label="Approve"
              className="w-10 h-10 rounded-lg bg-green-600/80 active:bg-green-600 disabled:opacity-40 text-white font-bold text-lg flex items-center justify-center shrink-0"
            >
              ✓
            </button>
          )}
          <span className="text-2xl">{assignment.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold leading-tight truncate">{assignment.chore_title}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-white/50 text-sm">{submittedAt}</span>
            </div>
          </div>
          <img src={buildAvatarSrc(assignment.child_avatar)} alt={assignment.child_name} className="w-10 h-10 rounded-full" />
          <div className="text-white font-semibold whitespace-nowrap">{assignment.points} pts</div>
        </div>
      </div>

      {showModal && (
        <ApprovalModal assignment={assignment} onClose={handleModalClose} disabled={autoApproved} />
      )}
    </>
  )
}


function ApprovalModal({ assignment, onClose, disabled = false }) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dashboard', 'parent'] })

  const [rejectMode, setRejectMode] = useState(false)
  const [comment, setComment] = useState('')
  const [showComments, setShowComments] = useState(false)
  const commentKb = useKboard(comment, setComment)

  const approve = useMutation({
    mutationFn: () => approveAssignment(assignment.id),
    onSuccess: () => { invalidate(); onClose() }
  })

  const reject = useMutation({
    mutationFn: () => rejectAssignment(assignment.id, comment),
    onSuccess: () => { invalidate(); onClose() }
  })

  const dismiss = useMutation({
    mutationFn: () => dismissAssignment(assignment.id),
    onSuccess: () => { invalidate(); onClose() }
  })

  const busy = approve.isPending || reject.isPending || dismiss.isPending
  const locked = busy || disabled
  const submittedAt = new Date(assignment.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[28rem] bg-slate-800 rounded-2xl p-5 flex flex-col gap-4" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="font-semibold truncate pr-4">{assignment.chore_title}</span>
          <button onClick={onClose} className="text-white/50 active:text-white/80 text-lg shrink-0">✕</button>
        </div>

        {/* Info */}
        <div className="flex items-center gap-3">
          <span className="text-3xl">{assignment.emoji}</span>
          <img src={buildAvatarSrc(assignment.child_avatar)} alt={assignment.child_name} className="w-10 h-10 rounded-full" />
          <div className="flex-1 min-w-0">
            <span className="text-sm text-white/50">{assignment.child_name} · {submittedAt}</span>
          </div>
          <span className="text-white font-semibold whitespace-nowrap">{assignment.points} pts</span>
        </div>

        {/* Auto-approved notice */}
        {disabled && (
          <div className="px-3 py-2 rounded-lg bg-green-500/15 text-green-300 text-sm text-center">
            Auto-approved — countdown finished
          </div>
        )}

        {/* Actions */}
        {rejectMode ? (
          <div className="flex flex-col gap-3">
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
                disabled={!comment.trim() || locked}
                className="flex-1 py-2.5 rounded-xl bg-red-600/80 text-sm font-medium disabled:opacity-40 active:bg-red-600"
              >Confirm Reject</button>
              <button
                onClick={() => { setRejectMode(false); setComment('') }}
                disabled={busy}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-sm font-medium disabled:opacity-40 active:bg-white/20"
              >Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => approve.mutate()}
              disabled={locked}
              className="flex-1 py-2.5 rounded-xl bg-green-600/80 text-sm font-medium disabled:opacity-40 active:bg-green-600"
            >Approve</button>
            <button
              onClick={() => setRejectMode(true)}
              disabled={locked}
              className="flex-1 py-2.5 rounded-xl bg-red-600/80 text-sm font-medium disabled:opacity-40 active:bg-red-600"
            >Reject</button>
            <button
              onClick={() => dismiss.mutate()}
              disabled={locked}
              className="py-2.5 px-4 rounded-xl bg-slate-600/60 text-sm font-medium disabled:opacity-40 active:bg-slate-600"
            >Dismiss</button>
          </div>
        )}

        {/* Comments toggle */}
        <button
          onClick={() => setShowComments(s => !s)}
          className="text-sm text-white/40 active:text-white/60 self-start"
        >{showComments ? 'Hide Comments' : 'View Comments'}</button>

        {showComments && <CommentThread assignmentId={assignment.id} />}

      </div>
    </div>
  )
}

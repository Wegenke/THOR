import { useState, useEffect, useRef } from 'react'
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

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatRecurrence(frequency, day_of_week, day_of_month) {
  if (!frequency) return null
  const label = frequency.charAt(0).toUpperCase() + frequency.slice(1)
  if (frequency === 'weekly' && day_of_week != null) return `${label} (${DAY_NAMES[day_of_week]})`
  if (frequency === 'monthly' && day_of_month != null) {
    const suffix = day_of_month === 1 || day_of_month === 21 ? 'st'
      : day_of_month === 2 || day_of_month === 22 ? 'nd'
      : day_of_month === 3 || day_of_month === 23 ? 'rd' : 'th'
    return `${label} (${day_of_month}${suffix})`
  }
  return label
}

export default function ChoreCard({ assignment, onRejectedModalChange, activeRejectedId, onRejectedDismissed, rejectedCount = 1 }) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dashboard', 'child'] })
  const isRejected = assignment.status === 'rejected'
  const isActiveRejected = isRejected && assignment.id === activeRejectedId
  const [showComments, setShowComments] = useState(false)
  const [rejectedReady, setRejectedReady] = useState(false)
  const rejectedDelay = rejectedCount === 1 ? 3000 : rejectedCount === 2 ? 2000 : 1000
  useEffect(() => {
    if (isActiveRejected) {
      setShowComments(true)
      setRejectedReady(false)
    }
  }, [isActiveRejected])
  useEffect(() => {
    if (showComments && isActiveRejected) {
      setRejectedReady(false)
      const timer = setTimeout(() => setRejectedReady(true), rejectedDelay)
      return () => clearTimeout(timer)
    }
  }, [showComments, isActiveRejected, rejectedDelay])
  useEffect(() => {
    if (!isActiveRejected || !onRejectedModalChange || !showComments) return
    onRejectedModalChange(c => c + 1)
    return () => onRejectedModalChange(c => c - 1)
  }, [showComments, isActiveRejected, onRejectedModalChange])

  const start = useMutation({ mutationFn: () => startAssignment(assignment.id), onSuccess: invalidate })
  const submit = useMutation({ mutationFn: () => submitAssignment(assignment.id), onSuccess: invalidate })
  const pause = useMutation({ mutationFn: () => pauseAssignment(assignment.id), onSuccess: invalidate })
  const resume = useMutation({ mutationFn: () => resumeAssignment(assignment.id), onSuccess: invalidate })
  const resumeRejected = useMutation({ mutationFn: () => resumeRejectedAssignment(assignment.id), onSuccess: invalidate })

  const busy = start.isPending || submit.isPending || pause.isPending || resume.isPending || resumeRejected.isPending

  const [pendingStart, setPendingStart] = useState(false)
  const [undoCountdown, setUndoCountdown] = useState(0)
  const undoIntervalRef = useRef(null)
  const pendingStartRef = useRef(false)

  const handleStart = () => {
    setPendingStart(true)
    pendingStartRef.current = true
    setUndoCountdown(2)
    undoIntervalRef.current = setInterval(() => setUndoCountdown(prev => prev - 1), 1000)
  }

  const handleUndo = () => {
    setPendingStart(false)
    pendingStartRef.current = false
    setUndoCountdown(0)
    clearInterval(undoIntervalRef.current)
  }

  useEffect(() => {
    if (pendingStart && undoCountdown <= 0) {
      clearInterval(undoIntervalRef.current)
      setPendingStart(false)
      pendingStartRef.current = false
      start.mutate()
    }
  }, [undoCountdown, pendingStart])

  useEffect(() => {
    return () => {
      clearInterval(undoIntervalRef.current)
      if (pendingStartRef.current) startAssignment(assignment.id).then(() => queryClient.invalidateQueries({ queryKey: ['dashboard', 'child'] }))
    }
  }, [])

  const [showDescription, setShowDescription] = useState(false)
  const { status, chore_title, emoji, points, description, frequency, day_of_week, day_of_month } = assignment
  const displayStatus = pendingStart ? 'in_progress' : status

  const recurrenceLabel = formatRecurrence(frequency, day_of_week, day_of_month)

  return (
    <>
      <div className="bg-white/15 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2 px-3">
          <button
            className="flex items-center gap-3 text-left active:opacity-70"
            onClick={() => setShowDescription(true)}
          >
            <span className="text-3xl">{emoji}</span>
            <div>
              <div className="font-semibold text-base leading-tight">{chore_title}</div>
              <div className="text-white/50 text-xs mt-0.5">{STATUS_LABELS[displayStatus] ?? displayStatus}</div>
            </div>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            {recurrenceLabel && (
              <div className="text-white/40 text-sm font-semibold">🔁 {recurrenceLabel}</div>
            )}
            <div className="text-white text-2xl font-semibold whitespace-nowrap">{points} pts</div>
          </div>
        </div>

        {pendingStart ? (
          <button onPointerDown={handleUndo}
            className="w-full py-3 rounded-lg bg-teal-400/80 font-medium active:bg-teal-400 text-lg">
            Undo ({undoCountdown}s)
          </button>
        ) : (
          <div className="flex gap-2">
            <div className="flex gap-2 flex-1 min-w-0">
              {status === 'assigned' && (
                <button onPointerDown={handleStart} disabled={busy}
                  className="flex-1 py-3 rounded-lg bg-green-600/80 font-medium disabled:opacity-40 active:bg-green-600">
                  Start
                </button>
              )}

              {(status === 'in_progress' || status === 'paused') && (
                <button onPointerDown={() => submit.mutate()} disabled={busy}
                  className="flex-1 py-3 rounded-lg bg-green-600/80 font-medium disabled:opacity-40 active:bg-green-600">
                  Submit
                </button>
              )}

              {status === 'in_progress' && (
                <button onPointerDown={() => pause.mutate()} disabled={busy}
                  className="flex-1 py-3 rounded-lg bg-orange-600/80 font-medium disabled:opacity-40 active:bg-orange-600">
                  Pause
                </button>
              )}

              {(status === 'paused' || status === 'parent_paused') && (
                <button onPointerDown={() => resume.mutate()} disabled={busy}
                  className="flex-1 py-3 rounded-lg bg-yellow-600/80 font-medium disabled:opacity-40 active:bg-yellow-600">
                  Resume
                </button>
              )}

              {status === 'rejected' && (
                <button onPointerDown={() => resumeRejected.mutate()} disabled={busy}
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

            <button onClick={() => setShowComments(true)}
              className="w-[10%] shrink-0 py-3 rounded-lg bg-sky-700/40 text-lg active:bg-sky-700/60">
              💬
            </button>
          </div>
        )}

      </div>

      {showDescription && (
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
            {description && <p className="text-white/70 leading-relaxed">{description}</p>}
            <div className="flex items-center justify-between text-sm">
              <span className="text-white font-semibold">{points} pts</span>
              {recurrenceLabel && <span className="text-white/40">🔁 {recurrenceLabel}</span>}
            </div>
          </div>
        </div>
      )}

      {showComments && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={isActiveRejected ? undefined : () => setShowComments(false)}>
          <div className="w-[36rem] bg-slate-800 rounded-2xl p-5 flex flex-col gap-3"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="font-semibold">{chore_title}</span>
              {isActiveRejected ? (
                <button
                  onClick={() => { setShowComments(false); onRejectedDismissed?.(assignment.id) }}
                  disabled={!rejectedReady}
                  className={`text-lg transition-opacity ${rejectedReady ? 'text-white/50 active:text-white/80' : 'opacity-0'}`}
                >✕</button>
              ) : (
                <button onClick={() => setShowComments(false)} className="text-white/50 active:text-white/80 text-lg">✕</button>
              )}
            </div>
            {isRejected && (
              <div className="text-xs text-red-400 uppercase tracking-wider font-medium">Rejected — review comments below</div>
            )}
            <CommentThread assignmentId={assignment.id} />
          </div>
        </div>
      )}
    </>
  )
}

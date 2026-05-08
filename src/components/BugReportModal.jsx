import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useKboard } from '../hooks/useKboard'
import { createBugReport } from '../api/bugs'

const MAX = 2000

export default function BugReportModal({ onClose }) {
  const [body, setBody] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const bodyKb = useKboard(body, setBody, { maxLength: MAX })

  const submit = useMutation({
    mutationFn: () => createBugReport(body),
    onSuccess: () => setSubmitted(true)
  })

  useEffect(() => {
    if (!submitted) return
    const t = setTimeout(onClose, 1500)
    return () => clearTimeout(t)
  }, [submitted, onClose])

  const trimmedLen = body.trim().length
  const canSubmit = trimmedLen > 0 && trimmedLen <= MAX && !submit.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-88 bg-slate-800 rounded-2xl p-5 flex flex-col gap-4" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <span className="font-semibold">🐞 Report a Bug</span>
          <button onClick={onClose} className="text-white/50 active:text-white/80 text-lg">✕</button>
        </div>

        {submitted ? (
          <div className="py-6 text-center text-green-300 text-sm">
            Thanks! We'll take a look.
          </div>
        ) : (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-white/50">What went wrong?</span>
              <textarea
                value={body}
                {...bodyKb}
                rows={5}
                maxLength={MAX}
                placeholder="Describe the issue in your own words..."
                className="bg-white/10 rounded-lg px-3 py-2 text-sm outline-none resize-none"
              />
              <span className="text-xs text-white/30 self-end">{body.length} / {MAX}</span>
            </label>

            {submit.isError && (
              <p className="text-xs text-red-400">{submit.error?.response?.data?.message ?? 'Something went wrong'}</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-sm font-medium active:bg-white/20"
              >Cancel</button>
              <button
                type="button"
                onClick={() => submit.mutate()}
                disabled={!canSubmit}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600/80 text-sm font-medium disabled:opacity-40 active:bg-indigo-600"
              >Submit</button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}

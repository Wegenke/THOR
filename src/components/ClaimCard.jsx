import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { claimAssignment } from '../api/assignments'

export default function ClaimCard({ assignment }) {
  const queryClient = useQueryClient()
  const [showDescription, setShowDescription] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const claim = useMutation({
    mutationFn: () => claimAssignment(assignment.id),
    onSuccess: () => {
      setClaimed(true)
      timerRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['assignments', 'available'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'child'] })
      }, 1000)
    }
  })

  const { emoji, chore_title, points, description, team_chore } = assignment

  return (
    <>
      <div className={`rounded-xl p-4 flex flex-col gap-3 transition-colors ${claimed ? 'bg-green-600/40' : 'bg-white/15'}`}>
        <div className="flex items-start justify-between gap-2 px-3">
          <button
            className="flex items-center gap-3 text-left active:opacity-70"
            onClick={() => description && setShowDescription(true)}
            disabled={claimed}
          >
            <span className="text-3xl">{emoji}</span>
            <div className="font-semibold text-lg leading-tight">{chore_title}</div>
          </button>
          <div className="text-white text-base font-semibold whitespace-nowrap shrink-0">{points} pts{team_chore ? ' each' : ''}</div>
        </div>
        <button
          onClick={() => !claimed && claim.mutate()}
          disabled={claim.isPending || claimed}
          className={`flex-1 py-3 rounded-lg font-medium ${
            claimed ? 'bg-green-500 text-white' : 'bg-blue-600/80 active:bg-blue-600 disabled:opacity-40'
          }`}
        >
          {claimed ? '✓ Claimed' : 'Claim'}
        </button>
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
    </>
  )
}

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { claimAssignment } from '../api/assignments'

export default function ClaimCard({ assignment }) {
  const queryClient = useQueryClient()
  const [showDescription, setShowDescription] = useState(false)

  const claim = useMutation({
    mutationFn: () => claimAssignment(assignment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', 'available'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'child'] })
    }
  })

  const { emoji, chore_title, points, description } = assignment

  return (
    <>
      <div className="bg-white/10 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2 px-3">
          <button
            className="flex items-center gap-3 text-left active:opacity-70"
            onClick={() => description && setShowDescription(true)}
          >
            <span className="text-3xl">{emoji}</span>
            <div className="font-semibold text-lg leading-tight">{chore_title}</div>
          </button>
          <div className="text-white text-base font-semibold whitespace-nowrap shrink-0">{points} pts</div>
        </div>
        <button
          onClick={() => claim.mutate()}
          disabled={claim.isPending}
          className="flex-1 py-3 rounded-lg bg-blue-600/80 font-medium disabled:opacity-40 active:bg-blue-600"
        >
          Claim
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

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { claimAssignment } from '../api/assignments'

export default function SlimClaimCard({ assignment }) {
  const queryClient = useQueryClient()
  const [showDescription, setShowDescription] = useState(false)

  const claim = useMutation({
    mutationFn: () => claimAssignment(assignment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', 'available'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'child'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'child', 'summary'] })
    }
  })

  const { emoji, chore_title, points, description } = assignment

  return (
    <>
      <div className="bg-white/10 rounded-xl p-3 flex items-center gap-3">
        <button
          className="flex items-center gap-3 flex-1 min-w-0 text-left active:opacity-70"
          onClick={() => description && setShowDescription(true)}
        >
          <span className="text-2xl shrink-0">{emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{chore_title}</div>
          </div>
          <span className="text-sm font-semibold text-white/70 shrink-0">{points} pts</span>
        </button>
        <button
          onPointerDown={() => claim.mutate()}
          disabled={claim.isPending}
          className="px-4 py-2 rounded-lg bg-blue-600/80 text-sm font-medium disabled:opacity-40 active:bg-blue-600 shrink-0"
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
            <div className="text-sm">
              <span className="text-white font-semibold">{points} pts</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

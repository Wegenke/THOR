import { useMutation, useQueryClient } from '@tanstack/react-query'
import { claimAssignment } from '../api/assignments'

export default function ClaimCard({ assignment }) {
  const queryClient = useQueryClient()
  const claim = useMutation({
    mutationFn: () => claimAssignment(assignment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', 'available'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'child'] })
    }
  })

  return (
    <div className="bg-white/10 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2 px-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{assignment.emoji}</span>
          <div className="font-semibold text-lg leading-tight">{assignment.chore_title}</div>
        </div>
        <div className="text-white text-base font-semibold whitespace-nowrap">{assignment.points} pts</div>
      </div>
      <button
        onClick={() => claim.mutate()}
        disabled={claim.isPending}
        className="flex-1 py-3 rounded-lg bg-white/10 font-medium disabled:opacity-40 active:bg-white/20"
      >
        Claim
      </button>
    </div>
  )
}

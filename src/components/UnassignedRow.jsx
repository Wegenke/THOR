import { useMutation, useQueryClient } from '@tanstack/react-query'
import { assignAssignment, cancelAssignment } from '../api/assignments'

export default function UnassignedRow({ assignment, children }) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['assignments'] })

  const assign = useMutation({ mutationFn: (child_id) => assignAssignment(assignment.id, child_id), onSuccess: invalidate })
  const cancel = useMutation({ mutationFn: () => cancelAssignment(assignment.id), onSuccess: invalidate })

  const busy = assign.isPending || cancel.isPending

  return (
    <div className="bg-white/5 rounded-lg px-3 py-2.5 flex items-center gap-2">
      <span className="text-xl">{assignment.emoji}</span>
      <div className="flex-1 min-w-0 text-base font-medium truncate">{assignment.chore_title}</div>
      <div className="text-white/50 text-xs whitespace-nowrap">{assignment.points} pts</div>
      {children.map(child => (
        <button
          key={child.id}
          onClick={() => assign.mutate(child.id)}
          disabled={busy}
          className="px-3 py-2 rounded-lg bg-blue-600/80 text-sm font-medium disabled:opacity-40 active:bg-blue-600"
        >
          {child.name}
        </button>
      ))}
      <button
        onClick={() => cancel.mutate()}
        disabled={busy}
        className="px-3 py-2 rounded-lg bg-red-600/80 text-sm font-medium disabled:opacity-40 active:bg-red-600"
      >
        ✕
      </button>
    </div>
  )
}

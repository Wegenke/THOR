import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAssignmentComments, postAssignmentComment } from '../api/assignments'
import { useKboard } from '../hooks/useKboard'

export default function CommentThread({ assignmentId }) {
  const queryClient = useQueryClient()
  const [text, setText] = useState('')

  const textKb = useKboard(text, setText)

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', assignmentId],
    queryFn: () => getAssignmentComments(assignmentId)
  })

  const post = useMutation({
    mutationFn: (value) => postAssignmentComment(assignmentId, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', assignmentId] })
      setText('')
    }
  })

  return (
    <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
      {!isLoading && comments.length === 0 && (
        <div className="text-white/30 text-xs text-center py-1">No comments yet</div>
      )}
      {comments.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {comments.map(c => (
            <div key={c.id} className="flex flex-col gap-0.5">
              <div className="text-white font-semibold leading-snug">{c.comment}</div>
              <div className="text-white/40 text-xs">
                {c.user_nick_name || c.user_name} · {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="none"
          value={text}
          {...textKb}
          placeholder="Add a comment…"
          className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-sm placeholder:text-white/30 outline-none"
        />
        <button
          onClick={() => post.mutate(text)}
          disabled={!text.trim() || post.isPending}
          className="px-3 py-2 rounded-lg bg-white/15 text-sm disabled:opacity-40 active:bg-white/25"
        >
          Send
        </button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useKboard } from '../hooks/useKboard'
import { getTaskNotes, addTaskNote } from '../api/parentTasks'

export default function TaskNotesModal({ task, onClose }) {
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')
  const contentKb = useKboard(content, setContent)

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['parentTaskNotes', task.id],
    queryFn: () => getTaskNotes(task.id)
  })

  const add = useMutation({
    mutationFn: () => addTaskNote(task.id, content.trim()),
    onSuccess: () => {
      setContent('')
      queryClient.invalidateQueries({ queryKey: ['parentTaskNotes', task.id] })
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!content.trim()) return
    add.mutate()
  }

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days === 1) return 'yesterday'
    return `${days}d ago`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[28rem] max-h-[80vh] bg-slate-800 rounded-2xl p-5 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="font-semibold truncate pr-4">{task.title}</span>
          <button onClick={onClose} className="text-white/50 active:text-white/80 text-lg shrink-0">✕</button>
        </div>

        {task.status !== 'archived' && (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              inputMode="none"
              value={content}
              {...contentKb}
              placeholder="Add a note…"
              className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-white/30 placeholder:text-white/30"
            />
            <button type="submit" disabled={!content.trim() || add.isPending}
              className="px-4 py-2 rounded-lg bg-indigo-600/80 text-sm font-medium disabled:opacity-40 active:bg-indigo-600">
              Add
            </button>
          </form>
        )}

        <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-2 min-h-0">
          {isLoading && <div className="text-white/30 text-sm text-center py-4">Loading…</div>}
          {!isLoading && notes.length === 0 && (
            <div className="text-white/30 text-sm text-center py-4">No notes yet</div>
          )}
          {notes.map(note => (
            <div key={note.id} className="bg-white/5 rounded-lg px-3 py-2 flex flex-col gap-1">
              <div className="text-sm text-white/80">{note.content}</div>
              <div className="text-xs text-white/30 flex justify-between">
                <span>{note.author_nick_name || note.author_name}</span>
                <span>{timeAgo(note.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useKboard } from '../hooks/useKboard'
import {
  getRewardNotes, addRewardNote, updateRewardNote, deleteRewardNote
} from '../api/rewards'

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

export default function RewardNotesSection({ rewardId }) {
  const queryClient = useQueryClient()
  const queryKey = ['rewardNotes', rewardId]

  const [draft, setDraft] = useState('')
  const draftKb = useKboard(draft, setDraft)

  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const editKb = useKboard(editDraft, setEditDraft)

  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null)

  const { data: notes = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getRewardNotes(rewardId)
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey })

  const add = useMutation({
    mutationFn: () => addRewardNote(rewardId, draft.trim()),
    onSuccess: () => { setDraft(''); invalidate() }
  })

  const update = useMutation({
    mutationFn: () => updateRewardNote(editingId, editDraft.trim()),
    onSuccess: () => {
      setEditingId(null)
      setEditDraft('')
      invalidate()
    }
  })

  const remove = useMutation({
    mutationFn: (noteId) => deleteRewardNote(noteId),
    onSuccess: () => {
      setConfirmingDeleteId(null)
      invalidate()
    }
  })

  const handleAdd = (e) => {
    e.preventDefault()
    if (!draft.trim()) return
    add.mutate()
  }

  const startEdit = (note) => {
    setConfirmingDeleteId(null)
    setEditingId(note.id)
    setEditDraft(note.body)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditDraft('')
  }

  const saveEdit = (originalBody) => {
    const trimmed = editDraft.trim()
    if (!trimmed || trimmed === originalBody) {
      cancelEdit()
      return
    }
    update.mutate()
  }

  const handleDeleteTap = (noteId) => {
    if (confirmingDeleteId === noteId) {
      remove.mutate(noteId)
    } else {
      setEditingId(null)
      setConfirmingDeleteId(noteId)
    }
  }

  return (
    <section className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/10">
      <span className="text-sm font-medium text-white/40 uppercase tracking-wider px-1">
        Notes ({notes.length})
      </span>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          inputMode="none"
          value={draft}
          {...draftKb}
          maxLength={2000}
          placeholder="Add a note…"
          className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-white/30 placeholder:text-white/30"
        />
        <button
          type="submit"
          disabled={!draft.trim() || add.isPending}
          className="px-4 py-2 rounded-lg bg-indigo-600/80 text-sm font-medium disabled:opacity-40 active:bg-indigo-600 shrink-0"
        >Add</button>
      </form>

      <div className="flex flex-col gap-2">
        {isLoading && (
          <div className="text-white/30 text-sm text-center py-3">Loading…</div>
        )}
        {!isLoading && notes.length === 0 && (
          <div className="text-white/30 text-sm text-center py-3">No notes yet</div>
        )}
        {notes.map(note => {
          const isEditing = editingId === note.id
          const isConfirmingDelete = confirmingDeleteId === note.id

          if (isEditing) {
            return (
              <div key={note.id} className="bg-white/5 rounded-lg px-3 py-2 flex items-center gap-2">
                <input
                  type="text"
                  inputMode="none"
                  value={editDraft}
                  {...editKb}
                  maxLength={2000}
                  className="flex-1 bg-white/10 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-white/30"
                />
                <button
                  onClick={() => saveEdit(note.body)}
                  disabled={!editDraft.trim() || update.isPending}
                  className="px-3 py-1.5 rounded-md text-sm font-medium bg-indigo-600/80 disabled:opacity-40 active:bg-indigo-600 shrink-0"
                >Save</button>
                <button
                  onClick={cancelEdit}
                  disabled={update.isPending}
                  className="px-3 py-1.5 rounded-md text-sm font-medium bg-white/10 active:bg-white/20 shrink-0"
                >Cancel</button>
              </div>
            )
          }

          return (
            <div key={note.id} className="bg-white/5 rounded-lg px-3 py-2 flex flex-col gap-1">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm text-white/80 flex-1 break-words">{note.body}</div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(note)}
                    className="px-2 py-0.5 text-base text-white/40 active:text-white/80"
                    aria-label="Edit note"
                  >✏️</button>
                  <button
                    onClick={() => handleDeleteTap(note.id)}
                    disabled={remove.isPending}
                    className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${
                      isConfirmingDelete
                        ? 'bg-red-600/80 text-white active:bg-red-600'
                        : 'text-base text-white/40 active:text-white/80'
                    }`}
                    aria-label={isConfirmingDelete ? 'Confirm delete' : 'Delete note'}
                  >{isConfirmingDelete ? 'Delete?' : '🗑️'}</button>
                </div>
              </div>
              <div className="text-xs text-white/30 flex justify-between">
                <span>{note.author_nick_name || note.author_name}</span>
                <span>{timeAgo(note.created_at)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

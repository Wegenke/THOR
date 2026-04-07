import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAuth } from '../context/AuthContext'
import { useKboard } from '../hooks/useKboard'
import TaskNotesModal from './TaskNotesModal'
import {
  getParentTasks, getRecentlyCompleted, createParentTask,
  startParentTask, pauseParentTask, archiveParentTask, addTaskNote, reorderParentTasks
} from '../api/parentTasks'

export default function ParentToDoTab() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['parentTasks'] })
    queryClient.invalidateQueries({ queryKey: ['parentTasks', 'recent'] })
  }

  const { data: tasks = [] } = useQuery({
    queryKey: ['parentTasks'],
    queryFn: getParentTasks
  })

  const { data: recentlyCompleted = [] } = useQuery({
    queryKey: ['parentTasks', 'recent'],
    queryFn: getRecentlyCompleted
  })

  const workingTasks = tasks.filter(t => t.status === 'working')
  const activeTasks = tasks.filter(t => t.status === 'active')

  const [notesTask, setNotesTask] = useState(null)

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {workingTasks.length > 0 && (
        <WorkingSection tasks={workingTasks} invalidate={invalidate} user={user} onViewNotes={setNotesTask} />
      )}

      {recentlyCompleted.length > 0 && (
        <RecentSection tasks={recentlyCompleted} onViewNotes={setNotesTask} />
      )}

      <ToDoSection tasks={activeTasks} invalidate={invalidate} onViewNotes={setNotesTask} />

      {notesTask && (
        <TaskNotesModal task={notesTask} onClose={() => setNotesTask(null)} />
      )}
    </div>
  )
}


// ─── Working On Section ──────────────────────────────────────────────────────

function WorkingSection({ tasks, invalidate, user, onViewNotes }) {
  const [pausingId, setPausingId] = useState(null)

  const archive = useMutation({ mutationFn: (id) => archiveParentTask(id), onSuccess: invalidate })

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1">
        Working On ({tasks.length})
      </h2>
      {tasks.map(task => (
        <div key={task.id} className="bg-white/15 rounded-xl p-4 flex items-center justify-between gap-3">
          <button className="flex-1 min-w-0 text-left active:opacity-70" onClick={() => onViewNotes(task)}>
            <div className="font-semibold leading-tight truncate">{task.title}</div>
            <div className="text-xs text-white/30 mt-1">
              {task.started_by === user.id ? 'You' : 'Partner'}
            </div>
          </button>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => onViewNotes(task)}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-sky-700/40 active:bg-sky-700/60"
            >📝</button>
            <button
              onClick={() => setPausingId(task.id)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-orange-600/80 active:bg-orange-600"
            >Pause</button>
            <button
              onClick={() => archive.mutate(task.id)}
              disabled={archive.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600/80 active:bg-green-600 disabled:opacity-40"
            >Done</button>
          </div>
        </div>
      ))}

      {pausingId && (
        <PauseModal
          taskId={pausingId}
          onClose={() => setPausingId(null)}
          onSuccess={() => { setPausingId(null); invalidate() }}
        />
      )}
    </section>
  )
}


// ─── Pause Modal ─────────────────────────────────────────────────────────────

function PauseModal({ taskId, onClose, onSuccess }) {
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')
  const noteKb = useKboard(note, setNote)

  const pause = useMutation({
    mutationFn: async () => {
      if (note.trim()) {
        await addTaskNote(taskId, note.trim())
      }
      return pauseParentTask(taskId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parentTaskNotes', taskId] })
      onSuccess()
    }
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-96 bg-slate-800 rounded-2xl p-5 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="font-semibold">Pause Task</span>
          <button onClick={onClose} className="text-white/50 active:text-white/80 text-lg">✕</button>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-white/50">Note <span className="text-white/30">(optional)</span></label>
          <textarea
            inputMode="none"
            value={note}
            {...noteKb}
            rows={3}
            className="bg-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-white/30 resize-none"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/10 text-sm font-medium active:bg-white/20">
            Cancel
          </button>
          <button onClick={() => pause.mutate()} disabled={pause.isPending}
            className="flex-1 py-2.5 rounded-xl bg-orange-600/80 text-sm font-medium disabled:opacity-40 active:bg-orange-600">
            Pause
          </button>
        </div>
      </div>
    </div>
  )
}


// ─── Recently Completed Section ──────────────────────────────────────────────

function RecentSection({ tasks, onViewNotes }) {
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return 'today'
    if (days === 1) return 'yesterday'
    return `${days} days ago`
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1">
        Recently Completed ({tasks.length})
      </h2>
      {tasks.map(task => (
        <button key={task.id} onClick={() => onViewNotes(task)}
          className="bg-white/5 rounded-xl p-4 flex items-center justify-between gap-3 text-left active:bg-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-green-400">✓</span>
            <span className="text-white/50 truncate">{task.title}</span>
          </div>
          <span className="text-xs text-white/30 shrink-0">{timeAgo(task.archived_at)}</span>
        </button>
      ))}
    </section>
  )
}


// ─── To Do Section (reorderable) ─────────────────────────────────────────────

function ToDoSection({ tasks, invalidate, onViewNotes }) {
  const [localOrder, setLocalOrder] = useState(tasks)
  const orderDirty = useRef(false)

  useEffect(() => {
    setLocalOrder(tasks)
  }, [tasks])

  // Save reorder on unmount if dirty
  const localOrderRef = useRef(localOrder)
  localOrderRef.current = localOrder
  useEffect(() => {
    return () => {
      if (orderDirty.current) {
        const ids = localOrderRef.current.map(t => t.id)
        reorderParentTasks(ids).catch(() => {})
      }
    }
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setLocalOrder(prev => {
      const oldIdx = prev.findIndex(t => t.id === active.id)
      const newIdx = prev.findIndex(t => t.id === over.id)
      orderDirty.current = true
      return arrayMove(prev, oldIdx, newIdx)
    })
  }, [])

  const [title, setTitle] = useState('')
  const titleKb = useKboard(title, setTitle)

  const create = useMutation({
    mutationFn: () => createParentTask({ title: title.trim() }),
    onSuccess: () => { setTitle(''); invalidate() }
  })

  const start = useMutation({ mutationFn: (id) => startParentTask(id), onSuccess: invalidate })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    create.mutate()
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1">
        To Do ({localOrder.length})
      </h2>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          inputMode="none"
          value={title}
          {...titleKb}
          placeholder="Add a task…"
          className="flex-1 bg-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-white/30 placeholder:text-white/30"
        />
        <button type="submit" disabled={!title.trim() || create.isPending}
          className="px-5 py-3 rounded-lg bg-indigo-600/80 text-sm font-medium disabled:opacity-40 active:bg-indigo-600">
          Add
        </button>
      </form>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={localOrder.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {localOrder.map(task => (
            <SortableTaskCard key={task.id} task={task} onStart={() => start.mutate(task.id)} busy={start.isPending} onViewNotes={onViewNotes} />
          ))}
        </SortableContext>
      </DndContext>

      {localOrder.length === 0 && (
        <div className="flex items-center justify-center h-20 text-white/30 text-sm">
          No tasks yet
        </div>
      )}
    </section>
  )
}


// ─── Sortable Task Card ──────────────────────────────────────────────────────

function SortableTaskCard({ task, onStart, busy, onViewNotes }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div ref={setNodeRef} style={style} className="bg-white/15 rounded-xl p-4 flex items-center gap-3">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-white/30 px-1 touch-none">
        ⠿
      </div>
      <button className="flex-1 min-w-0 text-left active:opacity-70" onClick={() => onViewNotes(task)}>
        <div className="font-semibold leading-tight truncate">{task.title}</div>
      </button>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => onViewNotes(task)}
          className="px-3 py-2 rounded-lg text-sm font-medium bg-sky-700/40 active:bg-sky-700/60"
        >📝</button>
        <button
          onClick={onStart}
          disabled={busy}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600/80 active:bg-blue-600 disabled:opacity-40"
        >Start</button>
      </div>
    </div>
  )
}

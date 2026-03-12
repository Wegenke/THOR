import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createAvatar } from '@dicebear/core'
import { pixelArt } from '@dicebear/collection'
import { getChores, createChore, updateChore } from '../api/chores'
import { getAssignments, createAssignment, cancelAssignment, parentPauseAssignment, reassignAssignment, assignAssignment } from '../api/assignments'
import { getProfiles } from '../api/auth'

function buildAvatar(avatar) {
  const { style, ...options } = avatar
  return createAvatar(pixelArt, options).toString()
}

const LIVE_STATUSES = ['assigned', 'in_progress', 'paused', 'parent_paused', 'submitted', 'rejected']

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'in_progress', label: 'Active' },
  { id: 'paused', label: 'Paused' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'rejected', label: 'Rejected' }
]

const STATUS_LABELS = {
  unassigned: 'Unassigned',
  assigned: 'Assigned',
  in_progress: 'In progress',
  paused: 'Paused',
  parent_paused: 'Paused by parent',
  submitted: 'Submitted',
  rejected: 'Rejected',
  approved: 'Approved',
  dismissed: 'Dismissed',
  cancelled: 'Cancelled'
}

const EMPTY_FORM = { title: '', emoji: '🦺', points: '', description: '', recurrence_rule: '' }

export default function ChoresTab() {
  const queryClient = useQueryClient()

  const { data: chores = [], isLoading: choresLoading } = useQuery({
    queryKey: ['chores'],
    queryFn: getChores
  })

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: getAssignments
  })

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: getProfiles
  })

  const children = profiles.filter(p => p.role === 'child')

  // Chore library state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingChoreId, setEditingChoreId] = useState(null)
  // Assignment filter state
  const [statusFilter, setStatusFilter] = useState('all')
  const [childFilter, setChildFilter] = useState('all')

  const unassigned = assignments.filter(a => a.status === 'unassigned')
  const filtered = assignments.filter(a => {
    if (!LIVE_STATUSES.includes(a.status)) return false
    if (statusFilter === 'paused') {
      if (a.status !== 'paused' && a.status !== 'parent_paused') return false
    } else if (statusFilter !== 'all' && a.status !== statusFilter) {
      return false
    }
    if (childFilter !== 'all' && childFilter !== 'none' && a.child_name !== childFilter) return false
    return true
  })

  return (
    <div className="flex gap-4 h-full">

      {/* Left: Chore Library */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider">
            Chore Library {chores.length > 0 && `(${chores.length})`}
          </h2>
          <button
            onClick={() => { setShowCreateForm(true); setEditingChoreId(null) }}
            className="px-3 py-1 rounded-lg bg-white/10 text-sm font-medium active:bg-white/20"
          >
            + New
          </button>
        </div>

        {choresLoading ? null : chores.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-white/30 text-sm">
            No chore templates yet
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {chores.map(chore => (
              <ChoreTemplateCard
                key={chore.id}
                chore={chore}
                children={children}
                onEdit={() => { setEditingChoreId(chore.id); setShowCreateForm(false) }}
                onAssign={(child_id) => {
                  const body = { chore_id: chore.id }
                  if (child_id) body.child_id = child_id
                  createAssignment(body).then(() => {
                    queryClient.invalidateQueries({ queryKey: ['assignments'] })
                  })
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right: Assignments */}
      <div className="w-96 flex flex-col gap-3 shrink-0 min-h-0">

        {/* Active Assignments */}
        <div className="flex flex-col gap-3 min-h-0 flex-1">
          <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1 shrink-0">
            Active Assignments {filtered.length > 0 && `(${filtered.length})`}
          </h2>

          {/* Status filter */}
          <div className="flex gap-1 flex-wrap px-1 shrink-0">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`text-xs px-2 py-1 rounded-full ${statusFilter === f.id ? 'bg-white/15 text-white' : 'bg-white/5 text-white/40 active:text-white/70'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Child filter */}
          <div className="flex gap-1 flex-wrap px-1 shrink-0">
            <button
              onClick={() => setChildFilter('all')}
              className={`text-xs px-2 py-1 rounded-full ${childFilter === 'all' ? 'bg-white/15 text-white' : 'bg-white/5 text-white/40 active:text-white/70'}`}
            >
              All
            </button>
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => setChildFilter(child.name)}
                className={`text-xs px-2 py-1 rounded-full ${childFilter === child.name ? 'bg-white/15 text-white' : 'bg-white/5 text-white/40 active:text-white/70'}`}
              >
                {child.name}
              </button>
            ))}
          </div>

          {assignmentsLoading ? null : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-white/30 text-sm">
              No active assignments
            </div>
          ) : (
            <div className="relative min-h-0 flex-1">
              <div className="flex flex-col gap-2 overflow-y-auto h-full scrollbar-hide">
                {filtered.map(a => (
                  <AssignmentRow key={a.id} assignment={a} children={children} />
                ))}
              </div>
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-900 to-transparent" />
            </div>
          )}
        </div>

        {/* Unassigned Pool */}
        <div className="flex flex-col gap-3 min-h-0 flex-1">
          <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1 shrink-0">
            Unassigned Pool {unassigned.length > 0 && `(${unassigned.length})`}
          </h2>
          {assignmentsLoading ? null : unassigned.length === 0 ? (
            <div className="flex items-center justify-center h-16 text-white/30 text-sm">
              No unassigned tasks
            </div>
          ) : (
            <div className="relative min-h-0 flex-1">
              <div className="flex flex-col gap-2 overflow-y-auto h-full scrollbar-hide">
                {unassigned.map(a => (
                  <UnassignedRow key={a.id} assignment={a} children={children} />
                ))}
              </div>
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-900 to-transparent" />
            </div>
          )}
        </div>

      </div>

      {/* Create Chore Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreateForm(false)}>
          <div className="w-[48rem] bg-slate-800 rounded-2xl p-6" onClick={e => e.stopPropagation()}>
            <ChoreForm
              onSave={(data) => {
                return createChore(data).then(() => {
                  queryClient.invalidateQueries({ queryKey: ['chores'] })
                  setShowCreateForm(false)
                })
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </div>
      )}

      {/* Edit Chore Modal */}
      {editingChoreId && (() => {
        const chore = chores.find(c => c.id === editingChoreId)
        if (!chore) return null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditingChoreId(null)}>
            <div className="w-[48rem] bg-slate-800 rounded-2xl p-6" onClick={e => e.stopPropagation()}>
              <ChoreForm
                initial={chore}
                onSave={(data) => {
                  return updateChore(chore.id, data).then(() => {
                    queryClient.invalidateQueries({ queryKey: ['chores'] })
                    setEditingChoreId(null)
                  })
                }}
                onCancel={() => setEditingChoreId(null)}
              />
            </div>
          </div>
        )
      })()}

    </div>
  )
}


function ChoreForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial
    ? { title: initial.title, emoji: initial.emoji, points: initial.points, description: initial.description || '', recurrence_rule: initial.recurrence_rule || '' }
    : { ...EMPTY_FORM }
  )
  const [saving, setSaving] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSave = () => {
    const data = { ...form, points: Number(form.points) }
    if (!data.description) delete data.description
    if (!data.recurrence_rule) delete data.recurrence_rule
    setSaving(true)
    onSave(data).catch(() => setSaving(false))
  }

  const valid = form.title.trim() && form.emoji.trim() && form.points && Number(form.points) % 10 === 0

  return (
    <div className="bg-white/10 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={form.emoji}
          onChange={set('emoji')}
          className="w-14 bg-white/10 rounded-lg px-2 py-2 text-center text-lg outline-none"
          placeholder="🦺"
        />
        <input
          type="text"
          value={form.title}
          onChange={set('title')}
          className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-sm outline-none placeholder:text-white/30"
          placeholder="Chore title"
          autoFocus
        />
        <input
          type="number"
          value={form.points}
          onChange={set('points')}
          step="10"
          min="10"
          className="w-20 bg-white/10 rounded-lg px-3 py-2 text-sm outline-none placeholder:text-white/30"
          placeholder="Pts"
        />
      </div>
      <input
        type="text"
        value={form.description}
        onChange={set('description')}
        className="bg-white/10 rounded-lg px-3 py-2 text-sm outline-none placeholder:text-white/30"
        placeholder="Description (optional)"
      />
      <input
        type="text"
        value={form.recurrence_rule}
        onChange={set('recurrence_rule')}
        className="bg-white/10 rounded-lg px-3 py-2 text-sm outline-none placeholder:text-white/30"
        placeholder="Recurrence rule (optional)"
      />
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!valid || saving}
          className="flex-1 py-2 rounded-lg bg-green-600/80 text-sm font-medium disabled:opacity-40 active:bg-green-600"
        >
          {saving ? 'Saving…' : initial ? 'Update' : 'Create'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="flex-1 py-2 rounded-lg bg-white/10 text-sm font-medium disabled:opacity-40 active:bg-white/20"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}


function ChoreTemplateCard({ chore, children, onEdit, onAssign }) {
  const [cooldowns, setCooldowns] = useState(new Set())

  const handleAssign = (key, child_id) => {
    setCooldowns(prev => new Set(prev).add(key))
    onAssign(child_id)
    setTimeout(() => setCooldowns(prev => { const next = new Set(prev); next.delete(key); return next }), 2000)
  }

  return (
    <div className="bg-white/10 rounded-xl p-4 flex flex-col justify-between gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{chore.emoji}</span>
          <div>
            <div className="font-semibold leading-tight">{chore.title}</div>
            {chore.description && (
              <div className="text-white/40 text-sm mt-0.5 truncate max-w-48">{chore.description}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold whitespace-nowrap">{chore.points} pts</span>
          <button onClick={onEdit} className="text-white/50 active:text-white/80 text-xl leading-none">⚙</button>
        </div>
      </div>

      {chore.recurrence_rule && (
        <div className="text-white/30 text-xs px-1">Recurs: {chore.recurrence_rule}</div>
      )}

      <div className="flex gap-2">
        {children.map(child => {
          const on = cooldowns.has(child.id)
          return (
            <button
              key={child.id}
              onClick={() => handleAssign(child.id, child.id)}
              disabled={on}
              className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 ${on ? 'bg-green-600/80 opacity-60' : 'bg-blue-600/80 active:bg-blue-600'}`}
            >
              {on ? '✓' : <>
                {child.avatar && <img src={`data:image/svg+xml;utf8,${encodeURIComponent(buildAvatar(child.avatar))}`} className="w-5 h-5 rounded-full" />}
                {child.name}
              </>}
            </button>
          )
        })}
        {(() => {
          const on = cooldowns.has('pool')
          return (
            <button
              onClick={() => handleAssign('pool', null)}
              disabled={on}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${on ? 'bg-green-600/80 opacity-60' : 'bg-white/10 active:bg-white/20'}`}
            >
              {on ? '✓' : 'Pool'}
            </button>
          )
        })()}
      </div>
    </div>
  )
}


function UnassignedRow({ assignment, children }) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['assignments'] })

  const assign = useMutation({ mutationFn: (child_id) => assignAssignment(assignment.id, child_id), onSuccess: invalidate })
  const cancel = useMutation({ mutationFn: () => cancelAssignment(assignment.id), onSuccess: invalidate })

  const busy = assign.isPending || cancel.isPending

  return (
    <div className="bg-white/5 rounded-lg px-3 py-2 flex items-center gap-2">
      <span className="text-lg">{assignment.emoji}</span>
      <div className="flex-1 min-w-0 text-sm font-medium truncate">{assignment.chore_title}</div>
      <div className="text-white/50 text-xs whitespace-nowrap">{assignment.points} pts</div>
      {children.map(child => (
        <button
          key={child.id}
          onClick={() => assign.mutate(child.id)}
          disabled={busy}
          className="px-2 py-1 rounded-md bg-blue-600/80 text-xs font-medium disabled:opacity-40 active:bg-blue-600"
        >
          {child.name}
        </button>
      ))}
      <button
        onClick={() => cancel.mutate()}
        disabled={busy}
        className="px-2 py-1 rounded-md bg-red-600/80 text-xs font-medium disabled:opacity-40 active:bg-red-600"
      >
        ✕
      </button>
    </div>
  )
}


function AssignmentRow({ assignment, children }) {
  const [expanded, setExpanded] = useState(false)
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['assignments'] })

  const collapse = () => setExpanded(false)
  const cancel = useMutation({ mutationFn: () => cancelAssignment(assignment.id), onSuccess: invalidate })
  const parentPause = useMutation({ mutationFn: () => parentPauseAssignment(assignment.id), onSuccess: invalidate })
  const reassign = useMutation({
    mutationFn: (child_id) => reassignAssignment(assignment.id, child_id),
    onSuccess: invalidate
  })

  const busy = cancel.isPending || parentPause.isPending || reassign.isPending
  const { status, chore_title, emoji, points, child_name, child_avatar } = assignment

  const canCancel = ['assigned', 'rejected'].includes(status)
  const canPause = status === 'in_progress'
  const canReassign = ['assigned', 'rejected'].includes(status)

  return (
    <div className="bg-white/10 rounded-xl px-4 py-3 flex flex-col gap-2">
      <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {child_avatar ? (
          <img
            src={`data:image/svg+xml;utf8,${encodeURIComponent(buildAvatar(child_avatar))}`}
            alt={child_name}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/30 text-sm border-3 border-dashed border-red-500/40">?</div>
        )}
        <span className="text-xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm leading-tight truncate">{chore_title}</div>
          <div className="text-white/50 text-xs mt-0.5">
            {child_name || 'Unassigned'} · {STATUS_LABELS[status] ?? status}
          </div>
        </div>
        <div className="text-white/70 text-sm whitespace-nowrap">{points} pts</div>
      </div>
      {expanded && (
        <div className="flex gap-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => { collapse(); parentPause.mutate() }}
            disabled={!canPause || busy}
            className="px-3 py-1.5 rounded-lg bg-orange-600/80 text-xs font-medium disabled:opacity-30 active:bg-orange-600"
          >
            Pause
          </button>
          {children.filter(c => String(c.id) !== String(assignment.child_id)).map(child => (
            <button
              key={child.id}
              onClick={() => { collapse(); reassign.mutate(child.id) }}
              disabled={!canReassign || busy}
              className="px-3 py-1.5 rounded-lg bg-blue-600/80 text-xs font-medium disabled:opacity-30 active:bg-blue-600"
            >
              → {child.name}
            </button>
          ))}
          <button
            onClick={() => { collapse(); cancel.mutate() }}
            disabled={!canCancel || busy}
            className="px-3 py-1.5 rounded-lg bg-red-600/80 text-xs font-medium disabled:opacity-30 active:bg-red-600"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

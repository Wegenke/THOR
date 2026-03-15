import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { buildAvatarSrc } from '../utils/avatar'
import { getChores, createChore, updateChore } from '../api/chores'
import { getAssignments, createAssignment, cancelAssignment, parentPauseAssignment, reassignAssignment, assignAssignment, unassignAssignment } from '../api/assignments'
import { createSchedule, updateSchedule as apiUpdateSchedule, deleteSchedule as apiDeleteSchedule } from '../api/schedules'
import { getProfiles } from '../api/auth'
import { useKboard } from '../hooks/useKboard'

const CHORE_EMOJIS = [
  '🧹','🧺','🧻','🧼','🧽','🪣','🪥','🛁','🚿','🚽',
  '🍽️','🥄','🍴','🫙','🛒','🥦','🥕','🥗','🍳','🧊',
  '🐕','🐈','🐾','🪴','💧','🌿','🌱','🌻','🌾','🍂',
  '📚','✏️','📝','🎒','🖊️','📖','🎨','🎵','🧩','🎮',
  '🚗','🪟','🪞','🪤','🔑','🏠','🛏️','🪑','🛋️','🏡',
  '⚙️','🔧','🔨','🪛','🔩','🪚','💡','🔋','📦','🗑️',
  '⭐','🏆','🎯','💰','💵','👏','✅','🌟','🎉','🥇',
]

function splitEmojis(str) {
  if (!str) return []
  return [...new Intl.Segmenter().segment(str)].map(s => s.segment)
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
  const [viewingChore, setViewingChore] = useState(null)
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
          <div className="relative">
            <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[26rem] scrollbar-hide">
              {chores.map(chore => (
                <ChoreTemplateCard
                  key={chore.id}
                  chore={chore}
                  children={children}
                  onTap={() => setViewingChore(chore)}
                  onEdit={() => { setEditingChoreId(chore.id); setShowCreateForm(false) }}
                  onAssign={(child_id) => {
                    const body = { chore_id: chore.id }
                    if (child_id) body.child_id = child_id
                    createAssignment(body).then(() => {
                      queryClient.invalidateQueries({ queryKey: ['assignments'] })
                    })
                  }}
                  onSchedule={(chore_id, child_id, frequency, day_of_week, day_of_month) => {
                    const body = { chore_id, child_id, frequency }
                    if (day_of_week !== undefined && day_of_week !== null) body.day_of_week = day_of_week
                    if (day_of_month !== undefined && day_of_month !== null) body.day_of_month = day_of_month
                    createSchedule(body).then(() => {
                      queryClient.invalidateQueries({ queryKey: ['chores'] })
                      queryClient.invalidateQueries({ queryKey: ['assignments'] })
                    })
                  }}
                />
              ))}
            </div>
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent" />
          </div>
        )}
      </div>

      {/* Right: Assignments */}
      <div className="w-96 flex flex-col gap-3 shrink-0 min-h-0">

        {/* Active Assignments */}
        <div className="flex flex-col gap-3 min-h-0 flex-[2]">
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
        <div className="flex flex-col gap-3 min-h-0 flex-1 max-h-52">
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

      {viewingChore && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setViewingChore(null)}
        >
          <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
            <div className="text-4xl">{viewingChore.emoji}</div>
            <div className="text-lg font-semibold">{viewingChore.title}</div>
            {viewingChore.description && (
              <div className="text-white/60 text-sm">{viewingChore.description}</div>
            )}
            <div className="text-white font-semibold">{viewingChore.points} pts</div>
            <ScheduleManager
              schedules={viewingChore.schedules || []}
              children={children}
              onUpdate={(id, data) => {
                apiUpdateSchedule(id, data).then(() => {
                  queryClient.invalidateQueries({ queryKey: ['chores'] })
                  setViewingChore(prev => ({
                    ...prev,
                    schedules: prev.schedules.map(s => s.id === id ? { ...s, ...data } : s)
                  }))
                })
              }}
              onDelete={(id) => {
                apiDeleteSchedule(id).then(() => {
                  queryClient.invalidateQueries({ queryKey: ['chores'] })
                  setViewingChore(prev => ({
                    ...prev,
                    schedules: prev.schedules.filter(s => s.id !== id)
                  }))
                })
              }}
            />
            <button
              onClick={() => setViewingChore(null)}
              className="py-2 rounded-lg bg-white/10 text-sm font-medium active:bg-white/20"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  )
}


function ChoreForm({ initial, onSave, onCancel }) {
  const [emoji,          setEmoji]         = useState(initial?.emoji            ?? '🦺')
  const [title,          setTitle]         = useState(initial?.title            ?? '')
  const [points,         setPoints]        = useState(initial?.points != null   ? String(initial.points) : '')
  const [description,    setDescription]   = useState(initial?.description      ?? '')
  const [saving,         setSaving]        = useState(false)

  const [emojiOpen, setEmojiOpen] = useState(false)

  const titleKb     = useKboard(title,          setTitle)
  const pointsKb    = useKboard(points,         setPoints,        { mode: 'numeric' })
  const descKb      = useKboard(description,    setDescription)

  const handleSave = () => {
    const data = { emoji, title, points: Number(points), description }
    if (!data.description) delete data.description
    setSaving(true)
    onSave(data).catch(() => setSaving(false))
  }

  const valid = title.trim() && emoji.trim() && points && Number(points) % 10 === 0

  return (
    <div className="bg-white/10 rounded-xl p-4 flex flex-col gap-2">
      {emojiOpen && (
        <EmojiPicker selected={emoji} onSelect={setEmoji} onClose={() => setEmojiOpen(false)} />
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setEmojiOpen(o => !o)}
          className="w-14 bg-white/10 rounded-lg px-2 py-2 text-center text-2xl active:bg-white/20 shrink-0"
        >
          {emoji}
        </button>
        <input
          type="text"
          value={title}
          {...titleKb}
          className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-sm outline-none placeholder:text-white/30"
          placeholder="Chore title"
          autoFocus
        />
        <input
          type="number"
          value={points}
          {...pointsKb}
          step="10"
          min="10"
          className="w-20 bg-white/10 rounded-lg px-3 py-2 text-sm outline-none placeholder:text-white/30"
          placeholder="Pts"
        />
      </div>
      <input
        type="text"
        value={description}
        {...descKb}
        className="bg-white/10 rounded-lg px-3 py-2 text-sm outline-none placeholder:text-white/30"
        placeholder="Description (optional)"
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


function EmojiPicker({ selected, onSelect, onClose }) {
  const [showCustom, setShowCustom] = useState(false)
  const parts = splitEmojis(selected)

  const handlePick = (e) => {
    if (parts.length < 2) {
      const next = selected + e
      onSelect(next)
      if (parts.length === 1) onClose()
    }
  }

  const handleRemove = (idx) => {
    onSelect(parts.filter((_, i) => i !== idx).join(''))
  }

  return (
    <div className="bg-slate-700 rounded-xl p-3 flex flex-col gap-2 border border-white/10">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-white/40 uppercase tracking-wide">Pick an emoji</span>
        <button type="button" onClick={onClose} className="text-white/40 active:text-white/70 text-sm">✕</button>
      </div>
      <div className="flex items-center gap-2 px-1">
        {parts.map((e, i) => (
          <div key={i} className="flex items-center gap-1 bg-white/20 rounded-lg px-2 py-1">
            <span className="text-xl">{e}</span>
            <button type="button" onClick={() => handleRemove(i)} className="text-white/40 active:text-white/70 text-xs leading-none">✕</button>
          </div>
        ))}
        {parts.length < 2 && (
          <span className="text-xs text-white/30 italic">
            {parts.length === 0 ? 'Tap to pick' : 'Tap to add a second'}
          </span>
        )}
      </div>
      <div className="grid grid-cols-10 gap-1">
        {CHORE_EMOJIS.map(e => (
          <button
            key={e}
            type="button"
            onClick={() => handlePick(e)}
            disabled={parts.length >= 2}
            className={`text-xl p-1.5 rounded-lg active:bg-white/20 disabled:opacity-30 ${parts.includes(e) ? 'bg-white/20' : ''}`}
          >
            {e}
          </button>
        ))}
      </div>
      {showCustom ? (
        <div className="flex items-center gap-2 px-1 pt-1 border-t border-white/10">
          <input
            type="text"
            autoFocus
            placeholder="Paste any emoji"
            disabled={parts.length >= 2}
            className="flex-1 bg-white/10 rounded-lg px-3 py-1.5 text-base text-white placeholder:text-white/30 outline-none disabled:opacity-30"
            onInput={(e) => {
              const emojis = splitEmojis(e.target.value)
              if (emojis.length > 0) {
                const slots = 2 - parts.length
                const toAdd = emojis.slice(0, slots)
                const next = selected + toAdd.join('')
                onSelect(next)
                e.target.value = ''
                if (parts.length + toAdd.length >= 2) onClose()
              }
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCustom(true)}
          disabled={parts.length >= 2}
          className="text-xs text-white/30 hover:text-white/50 active:text-white/50 px-1 pt-1 border-t border-white/10 text-left disabled:opacity-30"
        >
          Custom…
        </button>
      )}
    </div>
  )
}


function ChoreTemplateCard({ chore, children, onTap, onEdit, onAssign, onSchedule }) {
  const [cooldowns, setCooldowns] = useState(new Set())
  const [promptChild, setPromptChild] = useState(null)

  const handleOneTime = (child_id) => {
    const key = child_id ?? 'pool'
    setCooldowns(prev => new Set(prev).add(key))
    onAssign(child_id)
    setPromptChild(null)
    setTimeout(() => setCooldowns(prev => { const next = new Set(prev); next.delete(key); return next }), 2000)
  }

  const handleRecurring = (child_id, frequency, day_of_week, day_of_month) => {
    const key = child_id
    setCooldowns(prev => new Set(prev).add(key))
    onSchedule(chore.id, child_id, frequency, day_of_week, day_of_month)
    setPromptChild(null)
    setTimeout(() => setCooldowns(prev => { const next = new Set(prev); next.delete(key); return next }), 2000)
  }

  const hasSchedule = (child_id) => (chore.schedules || []).some(s => s.child_id === child_id)

  return (
    <div className="bg-white/10 rounded-xl p-3 flex flex-col justify-between gap-2">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{chore.emoji}</span>
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm whitespace-nowrap">{chore.points} pts</span>
          <button onClick={onEdit} className="text-white/50 active:text-white/80 text-xl leading-none">⚙</button>
        </div>
      </div>

      <div onClick={onTap} className="cursor-pointer">
        <div className="font-semibold leading-tight">{chore.title}</div>
        {chore.description && (
          <div className="text-white/40 text-sm mt-0.5 truncate">{chore.description}</div>
        )}
      </div>

      <ScheduleBadges schedules={chore.schedules} children={children} />

      <div className="flex gap-2">
        {children.map(child => {
          const on = cooldowns.has(child.id)
          const scheduled = hasSchedule(child.id)
          return (
            <button
              key={child.id}
              onClick={() => scheduled ? handleOneTime(child.id) : setPromptChild(child)}
              disabled={on}
              className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 ${on ? 'bg-green-600/80 opacity-60' : scheduled ? 'bg-purple-600/80 active:bg-purple-600' : 'bg-blue-600/80 active:bg-blue-600'}`}
            >
              {on ? '✓' : <>
                {child.avatar && <img src={buildAvatarSrc(child.avatar)} className="w-5 h-5 rounded-full" />}
                {child.name}
              </>}
            </button>
          )
        })}
        {(() => {
          const on = cooldowns.has('pool')
          return (
            <button
              onClick={() => handleOneTime(null)}
              disabled={on}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${on ? 'bg-green-600/80 opacity-60' : 'bg-white/10 active:bg-white/20'}`}
            >
              {on ? '✓' : 'Pool'}
            </button>
          )
        })()}
      </div>

      {promptChild && (
        <RecurrencePrompt
          childName={promptChild.name}
          onOneTime={() => handleOneTime(promptChild.id)}
          onRecurring={(freq, dow, dom) => handleRecurring(promptChild.id, freq, dow, dom)}
          onCancel={() => setPromptChild(null)}
        />
      )}
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
  const unassign = useMutation({ mutationFn: () => unassignAssignment(assignment.id), onSuccess: invalidate })

  const busy = cancel.isPending || parentPause.isPending || reassign.isPending || unassign.isPending
  const { status, chore_title, emoji, points, child_name, child_avatar } = assignment

  const canCancel = ['assigned', 'rejected'].includes(status)
  const canPause = status === 'in_progress'
  const canReassign = ['assigned', 'rejected'].includes(status)
  const canUnassign = ['assigned', 'rejected', 'paused', 'parent_paused'].includes(status)

  return (
    <div className="bg-white/10 rounded-xl px-4 py-3 flex flex-col gap-2">
      <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {child_avatar ? (
          <img
            src={buildAvatarSrc(child_avatar)}
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
            onClick={() => { collapse(); unassign.mutate() }}
            disabled={!canUnassign || busy}
            className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-medium disabled:opacity-30 active:bg-white/20"
          >
            → Pool
          </button>
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


const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatSchedule(schedule) {
  if (schedule.frequency === 'daily') return 'Daily'
  if (schedule.frequency === 'weekly') return `Weekly (${DAY_NAMES[schedule.day_of_week]})`
  if (schedule.frequency === 'monthly') return `Monthly (${schedule.day_of_month}${ordinal(schedule.day_of_month)})`
  return schedule.frequency
}

function ordinal(n) {
  if (n > 3 && n < 21) return 'th'
  const r = n % 10
  if (r === 1) return 'st'
  if (r === 2) return 'nd'
  if (r === 3) return 'rd'
  return 'th'
}

function ScheduleBadges({ schedules, children }) {
  if (!schedules || schedules.length === 0) return null
  const grouped = {}
  schedules.forEach(s => {
    const label = formatSchedule(s)
    if (!grouped[label]) grouped[label] = []
    const child = children.find(c => c.id === s.child_id)
    grouped[label].push(child?.name || '?')
  })
  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(grouped).map(([label, names]) => (
        <span key={label} className="text-xs bg-purple-600/30 text-purple-200 px-2 py-0.5 rounded-full">
          {label}: {names.join(', ')}
        </span>
      ))}
    </div>
  )
}


function RecurrencePrompt({ childName, onOneTime, onRecurring, onCancel }) {
  const [step, setStep] = useState('choose')
  const [dayOfWeek, setDayOfWeek] = useState(null)
  const [dayOfMonth, setDayOfMonth] = useState(null)

  if (step === 'choose') {
    return (
      <div className="bg-slate-700 rounded-xl p-3 flex flex-col gap-2 border border-white/10">
        <div className="text-xs text-white/40 uppercase tracking-wide">Assign to {childName}</div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={onOneTime} className="px-3 py-2 rounded-lg bg-blue-600/80 text-xs font-medium active:bg-blue-600">
            One-time
          </button>
          <button onClick={() => onRecurring('daily')} className="px-3 py-2 rounded-lg bg-purple-600/80 text-xs font-medium active:bg-purple-600">
            Daily
          </button>
          <button onClick={() => setStep('weekly')} className="px-3 py-2 rounded-lg bg-purple-600/80 text-xs font-medium active:bg-purple-600">
            Weekly
          </button>
          <button onClick={() => setStep('monthly')} className="px-3 py-2 rounded-lg bg-purple-600/80 text-xs font-medium active:bg-purple-600">
            Monthly
          </button>
          <button onClick={onCancel} className="px-3 py-2 rounded-lg bg-white/10 text-xs font-medium active:bg-white/20">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (step === 'weekly') {
    return (
      <div className="bg-slate-700 rounded-xl p-3 flex flex-col gap-2 border border-white/10">
        <div className="text-xs text-white/40 uppercase tracking-wide">Pick a day for {childName}</div>
        <div className="flex gap-1 flex-wrap">
          {DAY_NAMES.map((name, i) => (
            <button
              key={i}
              onClick={() => setDayOfWeek(i)}
              className={`px-3 py-2 rounded-lg text-xs font-medium ${dayOfWeek === i ? 'bg-purple-600 text-white' : 'bg-white/10 active:bg-white/20'}`}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onRecurring('weekly', dayOfWeek)}
            disabled={dayOfWeek === null}
            className="px-3 py-2 rounded-lg bg-purple-600/80 text-xs font-medium disabled:opacity-40 active:bg-purple-600"
          >
            Confirm
          </button>
          <button onClick={onCancel} className="px-3 py-2 rounded-lg bg-white/10 text-xs font-medium active:bg-white/20">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (step === 'monthly') {
    return (
      <div className="bg-slate-700 rounded-xl p-3 flex flex-col gap-2 border border-white/10">
        <div className="text-xs text-white/40 uppercase tracking-wide">Pick a date for {childName} (1-28)</div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
            <button
              key={d}
              onClick={() => setDayOfMonth(d)}
              className={`py-1.5 rounded-lg text-xs font-medium ${dayOfMonth === d ? 'bg-purple-600 text-white' : 'bg-white/10 active:bg-white/20'}`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onRecurring('monthly', undefined, dayOfMonth)}
            disabled={dayOfMonth === null}
            className="px-3 py-2 rounded-lg bg-purple-600/80 text-xs font-medium disabled:opacity-40 active:bg-purple-600"
          >
            Confirm
          </button>
          <button onClick={onCancel} className="px-3 py-2 rounded-lg bg-white/10 text-xs font-medium active:bg-white/20">
            Cancel
          </button>
        </div>
      </div>
    )
  }
}


function ScheduleManager({ schedules, children, onUpdate, onDelete }) {
  const [editingId, setEditingId] = useState(null)

  if (!schedules || schedules.length === 0) {
    return <div className="text-white/30 text-sm">No recurring schedules</div>
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-white/40 uppercase tracking-wide">Recurring Schedules</div>
      {schedules.map(s => {
        const child = children.find(c => c.id === s.child_id)
        const isEditing = editingId === s.id

        if (isEditing) {
          return (
            <ScheduleEditRow
              key={s.id}
              schedule={s}
              childName={child?.name || '?'}
              onSave={(data) => { onUpdate(s.id, data); setEditingId(null) }}
              onCancel={() => setEditingId(null)}
            />
          )
        }

        return (
          <div key={s.id} className="bg-white/5 rounded-lg px-3 py-2 flex items-center gap-2">
            {child?.avatar && <img src={buildAvatarSrc(child.avatar)} className="w-5 h-5 rounded-full" />}
            <span className="text-sm font-medium">{child?.name || '?'}</span>
            <span className="text-xs text-purple-300 bg-purple-600/30 px-2 py-0.5 rounded-full">{formatSchedule(s)}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${s.active ? 'bg-green-600/30 text-green-300' : 'bg-white/10 text-white/40'}`}>
              {s.active ? 'Active' : 'Paused'}
            </span>
            <div className="flex-1" />
            <button
              onClick={() => onUpdate(s.id, { active: !s.active })}
              className="text-xs px-2 py-1 rounded-lg bg-white/10 active:bg-white/20"
            >
              {s.active ? 'Pause' : 'Resume'}
            </button>
            <button
              onClick={() => setEditingId(s.id)}
              className="text-xs px-2 py-1 rounded-lg bg-white/10 active:bg-white/20"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(s.id)}
              className="text-xs px-2 py-1 rounded-lg bg-red-600/80 active:bg-red-600"
            >
              Delete
            </button>
          </div>
        )
      })}
    </div>
  )
}


function ScheduleEditRow({ schedule, childName, onSave, onCancel }) {
  const [frequency, setFrequency] = useState(schedule.frequency)
  const [dayOfWeek, setDayOfWeek] = useState(schedule.day_of_week)
  const [dayOfMonth, setDayOfMonth] = useState(schedule.day_of_month)

  const handleSave = () => {
    const data = { frequency }
    if (frequency === 'weekly') data.day_of_week = dayOfWeek
    if (frequency === 'monthly') data.day_of_month = dayOfMonth
    if (frequency === 'daily') { data.day_of_week = null; data.day_of_month = null }
    onSave(data)
  }

  const valid = frequency === 'daily' || (frequency === 'weekly' && dayOfWeek !== null) || (frequency === 'monthly' && dayOfMonth !== null)

  return (
    <div className="bg-white/10 rounded-lg p-3 flex flex-col gap-2">
      <div className="text-xs text-white/40">Editing schedule for {childName}</div>
      <div className="flex gap-1">
        {['daily', 'weekly', 'monthly'].map(f => (
          <button
            key={f}
            onClick={() => setFrequency(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${frequency === f ? 'bg-purple-600 text-white' : 'bg-white/10 active:bg-white/20'}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      {frequency === 'weekly' && (
        <div className="flex gap-1 flex-wrap">
          {DAY_NAMES.map((name, i) => (
            <button
              key={i}
              onClick={() => setDayOfWeek(i)}
              className={`px-2 py-1 rounded-lg text-xs ${dayOfWeek === i ? 'bg-purple-600 text-white' : 'bg-white/10 active:bg-white/20'}`}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      {frequency === 'monthly' && (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
            <button
              key={d}
              onClick={() => setDayOfMonth(d)}
              className={`py-1 rounded-lg text-xs ${dayOfMonth === d ? 'bg-purple-600 text-white' : 'bg-white/10 active:bg-white/20'}`}
            >
              {d}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={!valid} className="px-3 py-1.5 rounded-lg bg-green-600/80 text-xs font-medium disabled:opacity-40 active:bg-green-600">
          Save
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-medium active:bg-white/20">
          Cancel
        </button>
      </div>
    </div>
  )
}

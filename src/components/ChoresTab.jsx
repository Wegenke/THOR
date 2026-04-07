import { useState, useContext } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { KboardContext } from '../context/KboardContext'
import { buildAvatarSrc } from '../utils/avatar'
import { getChores, createChore, updateChore } from '../api/chores'
import { getAssignments, createAssignment } from '../api/assignments'
import { createSchedule, updateSchedule as apiUpdateSchedule, deleteSchedule as apiDeleteSchedule } from '../api/schedules'
import { getProfiles } from '../api/auth'
import ChoreTemplateCard, { DAY_NAMES, formatSchedule } from './ChoreTemplateCard'
import ChoreForm from './ChoreForm'
import AssignmentRow from './AssignmentRow'
import UnassignedRow from './UnassignedRow'

const LIVE_STATUSES = ['assigned', 'in_progress', 'paused', 'parent_paused', 'submitted', 'rejected']

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'in_progress', label: 'Active' },
  { id: 'paused', label: 'Paused' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'rejected', label: 'Rejected' }
]


export default function ChoresTab() {
  const queryClient = useQueryClient()
  const kb = useContext(KboardContext)

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
          <div className="relative flex-1 min-h-0">
            <div className="grid grid-cols-2 gap-3 overflow-y-auto h-full scrollbar-hide">
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
                  onDeleteSchedule={(id) => {
                    apiDeleteSchedule(id).then(() => {
                      queryClient.invalidateQueries({ queryKey: ['chores'] })
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
        <div className="flex flex-col gap-3 min-h-0 flex-1 max-h-60">
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
        <div className={`fixed inset-0 z-50 flex justify-center bg-black/60 ${kb?.visible ? 'items-start pt-[15vh]' : 'items-center'}`} onClick={() => setShowCreateForm(false)}>
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
          <div className={`fixed inset-0 z-50 flex justify-center bg-black/60 ${kb?.visible ? 'items-start pt-[15vh]' : 'items-center'}`} onClick={() => setEditingChoreId(null)}>
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
          <div className="bg-slate-800 rounded-2xl p-10 w-[48rem] flex flex-col gap-5" onClick={e => e.stopPropagation()}>
            <div className="text-5xl">{viewingChore.emoji}</div>
            <div className="text-2xl font-semibold">{viewingChore.title}</div>
            {viewingChore.description && (
              <div className="text-white/60 text-base">{viewingChore.description}</div>
            )}
            <div className="text-white font-semibold text-lg">{viewingChore.points} pts</div>
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
              className="py-4 rounded-lg bg-white/10 text-base font-medium active:bg-white/20"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  )
}


function ScheduleManager({ schedules, children, onUpdate, onDelete }) {
  const [editingId, setEditingId] = useState(null)

  if (!schedules || schedules.length === 0) {
    return <div className="text-white/30 text-sm">No recurring schedules</div>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm text-white/40 uppercase tracking-wide">Recurring Schedules</div>
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
          <div key={s.id} className="bg-white/5 rounded-lg px-5 py-4 flex items-center gap-3">
            {child?.avatar && <img src={buildAvatarSrc(child.avatar)} className="w-8 h-8 rounded-full" />}
            <span className="text-base font-medium">{child?.name || '?'}</span>
            <span className="text-sm text-purple-300 bg-purple-600/30 px-3 py-1 rounded-full">{formatSchedule(s)}</span>
            <span className={`text-sm px-3 py-1 rounded-full ${s.active ? 'bg-green-600/30 text-green-300' : 'bg-white/10 text-white/40'}`}>
              {s.active ? 'Active' : 'Paused'}
            </span>
            <div className="flex-1" />
            <button
              onClick={() => onUpdate(s.id, { active: !s.active })}
              className="text-sm px-4 py-2.5 rounded-lg bg-white/10 active:bg-white/20"
            >
              {s.active ? 'Pause' : 'Resume'}
            </button>
            <button
              onClick={() => setEditingId(s.id)}
              className="text-sm px-4 py-2.5 rounded-lg bg-white/10 active:bg-white/20"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(s.id)}
              className="text-sm px-4 py-2.5 rounded-lg bg-red-600/80 active:bg-red-600"
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
    <div className="bg-white/15 rounded-lg p-5 flex flex-col gap-3">
      <div className="text-sm text-white/40">Editing schedule for {childName}</div>
      <div className="flex gap-2">
        {['daily', 'weekly', 'monthly'].map(f => (
          <button
            key={f}
            onClick={() => setFrequency(f)}
            className={`px-5 py-3 rounded-lg text-sm font-medium ${frequency === f ? 'bg-purple-600 text-white' : 'bg-white/10 active:bg-white/20'}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      {frequency === 'weekly' && (
        <div className="flex gap-2 flex-wrap">
          {DAY_NAMES.map((name, i) => (
            <button
              key={i}
              onClick={() => setDayOfWeek(i)}
              className={`px-4 py-2.5 rounded-lg text-sm ${dayOfWeek === i ? 'bg-purple-600 text-white' : 'bg-white/10 active:bg-white/20'}`}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      {frequency === 'monthly' && (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
            <button
              key={d}
              onClick={() => setDayOfMonth(d)}
              className={`py-2.5 rounded-lg text-sm ${dayOfMonth === d ? 'bg-purple-600 text-white' : 'bg-white/10 active:bg-white/20'}`}
            >
              {d}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={handleSave} disabled={!valid} className="px-5 py-3 rounded-lg bg-green-600/80 text-sm font-medium disabled:opacity-40 active:bg-green-600">
          Save
        </button>
        <button onClick={onCancel} className="px-5 py-3 rounded-lg bg-white/10 text-sm font-medium active:bg-white/20">
          Cancel
        </button>
      </div>
    </div>
  )
}

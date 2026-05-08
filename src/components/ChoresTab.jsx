import { useState, useContext, useRef, useLayoutEffect } from 'react'
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
import FilterPanel, { FilterSection, FilterOption } from './FilterPanel'

const LIVE_STATUSES = ['assigned', 'in_progress', 'paused', 'parent_paused', 'submitted', 'rejected']

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'in_progress', label: 'Active' },
  { id: 'paused', label: 'Paused' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'rejected', label: 'Rejected' }
]


export default function ChoresTab({ childFilter, setChildFilter }) {
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
  const [showAssignmentFilter, setShowAssignmentFilter] = useState(false)
  const hasAssignmentFilters = statusFilter !== 'all' || childFilter !== 'all'
  const clearAssignmentFilters = () => { setStatusFilter('all'); setChildFilter('all') }

  const unassigned = assignments.filter(a => a.status === 'unassigned')
  const poolCountByChore = {}
  for (const a of unassigned) {
    poolCountByChore[a.chore_id] = (poolCountByChore[a.chore_id] || 0) + 1
  }
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
          <ChoreLibraryPanel
            chores={chores}
            children={children}
            poolCountByChore={poolCountByChore}
            onTap={(chore) => setViewingChore({ ...chore, pool_count: poolCountByChore[chore.id] || 0 })}
            onEdit={(id) => { setEditingChoreId(id); setShowCreateForm(false) }}
            onAssign={(chore_id, child_id) => {
              const body = { chore_id }
              if (child_id) body.child_id = child_id
              createAssignment(body).then(() => {
                queryClient.invalidateQueries({ queryKey: ['assignments'] })
              })
            }}
            onSchedule={(chore_id, child_id, frequency, day_of_week, day_of_month) => {
              const body = { chore_id, frequency }
              if (child_id !== null && child_id !== undefined) body.child_id = child_id
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
        )}
      </div>

      {/* Right: Assignments */}
      <div className="w-96 flex flex-col gap-3 shrink-0 min-h-0">

        {/* Active Assignments */}
        <div className="flex flex-col gap-3 min-h-0 flex-[2]">
          <div className="flex items-center gap-2 px-1 shrink-0">
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider flex-1">
              Active Assignments {filtered.length > 0 && `(${filtered.length})`}
            </h2>
            <button onClick={() => setShowAssignmentFilter(true)} className="relative active:opacity-70">
              <span className="text-lg">🔍</span>
              {hasAssignmentFilters && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-400 rounded-full" />}
            </button>
          </div>

          {assignmentsLoading ? null : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-white/30 text-sm">
              No active assignments
            </div>
          ) : (
            <OverflowFadePanel>
              {filtered.map(a => (
                <AssignmentRow key={a.id} assignment={a} children={children} />
              ))}
            </OverflowFadePanel>
          )}
        </div>

        {/* Unassigned Pool */}
        {!assignmentsLoading && unassigned.length > 0 && (
          <div className="flex flex-col gap-3 min-h-0 flex-1 max-h-60">
            <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1 shrink-0">
              Unassigned Pool ({unassigned.length})
            </h2>
            <OverflowFadePanel>
              {unassigned.map(a => (
                <UnassignedRow key={a.id} assignment={a} children={children} />
              ))}
            </OverflowFadePanel>
          </div>
        )}

      </div>

      {/* Active Assignments filter panel */}
      <FilterPanel
        show={showAssignmentFilter}
        onClose={() => setShowAssignmentFilter(false)}
        side="right"
        title="Assignment Filters"
        hasActiveFilters={hasAssignmentFilters}
        onClear={clearAssignmentFilters}
      >
        <FilterSection title="Status">
          {STATUS_FILTERS.map(f => (
            <FilterOption key={f.id} active={statusFilter === f.id} onClick={() => setStatusFilter(f.id)}>
              <span className="text-sm font-medium">{f.label}</span>
            </FilterOption>
          ))}
        </FilterSection>
        <FilterSection title="Children">
          <FilterOption active={childFilter === 'all'} onClick={() => setChildFilter('all')}>
            <span className="text-sm font-medium">All</span>
          </FilterOption>
          {children.map(child => (
            <FilterOption key={child.id} active={childFilter === child.name} onClick={() => setChildFilter(child.name)}>
              <img
                src={buildAvatarSrc(child.avatar)}
                alt={child.nick_name || child.name}
                className={`w-10 h-10 rounded-full transition-shadow ${childFilter === child.name ? 'ring-2 ring-indigo-400' : ''}`}
              />
              <span className="text-sm font-medium">{child.nick_name || child.name}</span>
            </FilterOption>
          ))}
        </FilterSection>
      </FilterPanel>

      {/* Create Chore Modal */}
      {showCreateForm && (
        <div className={`fixed inset-0 z-50 flex justify-center bg-black/60 ${kb?.visible ? 'items-start pt-[15vh]' : 'items-center'}`} onPointerDown={() => setShowCreateForm(false)}>
          <div className="w-[48rem] bg-slate-800 rounded-2xl p-6" onPointerDown={e => e.stopPropagation()}>
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
          <div className={`fixed inset-0 z-50 flex justify-center bg-black/60 ${kb?.visible ? 'items-start pt-[15vh]' : 'items-center'}`} onPointerDown={() => setEditingChoreId(null)}>
            <div className="w-[48rem] bg-slate-800 rounded-2xl p-6" onPointerDown={e => e.stopPropagation()}>
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
            <div className="flex items-start justify-between gap-3">
              <div className="text-5xl">{viewingChore.emoji}</div>
              {viewingChore.pool_count > 0 && (
                <span className="px-3 py-1 rounded-full bg-amber-600/30 text-amber-200 text-sm font-semibold whitespace-nowrap">
                  🏊 Currently in Pool: {viewingChore.pool_count}
                </span>
              )}
            </div>
            <div className="text-2xl font-semibold">{viewingChore.title}</div>
            {viewingChore.description && (
              <div className="text-white/60 text-base">{viewingChore.description}</div>
            )}
            <div className="text-white font-semibold text-lg">
              {viewingChore.points} pts{viewingChore.team_chore && <span className="text-white/50 text-base font-normal"> each</span>}
            </div>
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


function ChoreLibraryPanel({ chores, children, poolCountByChore = {}, onTap, onEdit, onAssign, onSchedule, onDeleteSchedule }) {
  const scrollRef = useRef(null)
  const [overflows, setOverflows] = useState(false)

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [chores.length])

  return (
    <div className="relative flex-1 min-h-0">
      <div ref={scrollRef} className="grid grid-cols-2 gap-3 overflow-y-auto h-full scrollbar-hide items-start">
        {chores.map(chore => (
          <ChoreTemplateCard
            key={chore.id}
            chore={chore}
            children={children}
            poolCount={poolCountByChore[chore.id] || 0}
            onTap={() => onTap(chore)}
            onEdit={() => onEdit(chore.id)}
            onAssign={(child_id) => onAssign(chore.id, child_id)}
            onSchedule={(chore_id, child_id, frequency, day_of_week, day_of_month) =>
              onSchedule(chore_id, child_id, frequency, day_of_week, day_of_month)
            }
            onDeleteSchedule={onDeleteSchedule}
          />
        ))}
      </div>
      {overflows && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent" />
      )}
    </div>
  )
}


function OverflowFadePanel({ children }) {
  const scrollRef = useRef(null)
  const [overflows, setOverflows] = useState(false)

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [children])

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scrollRef} className="flex flex-col gap-2 overflow-y-auto h-full scrollbar-hide">
        {children}
      </div>
      {overflows && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-900 to-transparent" />
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
        const isPool = s.child_id === null
        const child = isPool ? null : children.find(c => c.id === s.child_id)
        const isEditing = editingId === s.id
        const label = isPool ? 'Pool' : (child?.name || '?')

        if (isEditing) {
          return (
            <ScheduleEditRow
              key={s.id}
              schedule={s}
              childName={label}
              onSave={(data) => { onUpdate(s.id, data); setEditingId(null) }}
              onCancel={() => setEditingId(null)}
            />
          )
        }

        return (
          <div key={s.id} className="bg-white/5 rounded-lg px-5 py-4 flex items-center gap-3">
            {isPool ? (
              <span className="w-8 h-8 rounded-full bg-amber-600/40 flex items-center justify-center text-base">🏊</span>
            ) : (
              child?.avatar && <img src={buildAvatarSrc(child.avatar)} className="w-8 h-8 rounded-full" />
            )}
            <span className="text-base font-medium">{label}</span>
            <span className={`text-sm px-3 py-1 rounded-full ${isPool ? 'text-amber-300 bg-amber-600/30' : 'text-purple-300 bg-purple-600/30'}`}>{formatSchedule(s)}</span>
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

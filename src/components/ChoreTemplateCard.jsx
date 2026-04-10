import { useState, useRef, useEffect } from 'react'
import { buildAvatarSrc } from '../utils/avatar'

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function formatSchedule(schedule) {
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

function getChildFrequency(schedules, child_id) {
  const childSchedules = (schedules || []).filter(s => s.child_id === child_id)
  if (childSchedules.length === 0) return null
  return childSchedules[0].frequency
}

function RecurrencePrompt({ childName, existingSchedules, onOneTime, onRecurring, onDeleteSchedule, onDone, onCancel }) {
  const [step, setStep] = useState('choose')

  // Pre-populate from existing schedules
  const existingWeekDays = new Set(existingSchedules.filter(s => s.frequency === 'weekly').map(s => s.day_of_week))
  const existingMonthDates = new Set(existingSchedules.filter(s => s.frequency === 'monthly').map(s => s.day_of_month))
  const hasDaily = existingSchedules.some(s => s.frequency === 'daily')

  const [daysOfWeek, setDaysOfWeek] = useState(existingWeekDays)
  const [daysOfMonth, setDaysOfMonth] = useState(existingMonthDates)

  const toggleDay = (day) => setDaysOfWeek(prev => {
    const next = new Set(prev)
    next.has(day) ? next.delete(day) : next.add(day)
    return next
  })

  const toggleDate = (date) => setDaysOfMonth(prev => {
    const next = new Set(prev)
    next.has(date) ? next.delete(date) : next.add(date)
    return next
  })

  const handleWeeklyConfirm = () => {
    // Delete removed days
    for (const s of existingSchedules) {
      if (s.frequency === 'weekly' && !daysOfWeek.has(s.day_of_week)) {
        onDeleteSchedule(s.id)
      }
    }
    // Add new days
    for (const day of daysOfWeek) {
      if (!existingWeekDays.has(day)) {
        onRecurring('weekly', day)
      }
    }
    onDone()
  }

  const handleMonthlyConfirm = () => {
    // Delete removed dates
    for (const s of existingSchedules) {
      if (s.frequency === 'monthly' && !daysOfMonth.has(s.day_of_month)) {
        onDeleteSchedule(s.id)
      }
    }
    // Add new dates
    for (const date of daysOfMonth) {
      if (!existingMonthDates.has(date)) {
        onRecurring('monthly', undefined, date)
      }
    }
    onDone()
  }

  const weeklyChanged = (() => {
    if (daysOfWeek.size !== existingWeekDays.size) return true
    for (const d of daysOfWeek) if (!existingWeekDays.has(d)) return true
    return false
  })()

  const monthlyChanged = (() => {
    if (daysOfMonth.size !== existingMonthDates.size) return true
    for (const d of daysOfMonth) if (!existingMonthDates.has(d)) return true
    return false
  })()

  if (step === 'choose') {
    return (
      <div className="bg-slate-700 rounded-xl p-3 flex flex-col gap-2 border border-white/10">
        <div className="flex gap-2 flex-wrap">
          <button onClick={onOneTime} className="px-3 py-2 rounded-lg bg-blue-600/80 text-xs font-medium active:bg-blue-600">
            One-time
          </button>
          {!hasDaily && (
            <button onClick={() => { onRecurring('daily'); onDone() }} className="px-3 py-2 rounded-lg bg-purple-600/40 text-xs font-medium active:bg-purple-600">
              Daily
            </button>
          )}
          {hasDaily && (
            <button onClick={() => { const d = existingSchedules.find(s => s.frequency === 'daily'); if (d) onDeleteSchedule(d.id); onDone() }} className="px-3 py-2 rounded-lg bg-purple-600 text-xs font-medium text-white active:bg-purple-600/60">
              Daily <span className="font-bold">✓</span>
            </button>
          )}
          <button onClick={() => setStep('weekly')} className={`px-3 py-2 rounded-lg text-xs font-medium ${existingWeekDays.size > 0 ? 'bg-purple-600 text-white active:bg-purple-600/60' : 'bg-purple-600/40 active:bg-purple-600'}`}>
            Weekly{existingWeekDays.size > 0 && <span className="font-bold"> ✓</span>}
          </button>
          <button onClick={() => setStep('monthly')} className={`px-3 py-2 rounded-lg text-xs font-medium ${existingMonthDates.size > 0 ? 'bg-purple-600 text-white active:bg-purple-600/60' : 'bg-purple-600/40 active:bg-purple-600'}`}>
            Monthly{existingMonthDates.size > 0 && <span className="font-bold"> ✓</span>}
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
        <div className="flex gap-1 flex-wrap">
          {DAY_NAMES.map((name, i) => (
            <button
              key={i}
              onClick={() => toggleDay(i)}
              className={`px-3 py-2 rounded-lg text-xs font-medium ${daysOfWeek.has(i) ? 'bg-purple-600 text-white' : 'bg-white/10 active:bg-white/20'}`}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleWeeklyConfirm}
            disabled={!weeklyChanged}
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
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
            <button
              key={d}
              onClick={() => toggleDate(d)}
              className={`py-1.5 rounded-lg text-xs font-medium ${daysOfMonth.has(d) ? 'bg-purple-600 text-white' : 'bg-white/10 active:bg-white/20'}`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleMonthlyConfirm}
            disabled={!monthlyChanged}
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

export default function ChoreTemplateCard({ chore, children, onTap, onEdit, onAssign, onSchedule, onDeleteSchedule }) {
  const [cooldowns, setCooldowns] = useState(new Set())
  const [promptChild, setPromptChild] = useState(null)
  const cardRef = useRef(null)

  useEffect(() => {
    if (promptChild) cardRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [promptChild])

  const handleOneTime = (child_id) => {
    const key = child_id ?? 'pool'
    setCooldowns(prev => new Set(prev).add(key))
    onAssign(child_id)
    setPromptChild(null)
    setTimeout(() => setCooldowns(prev => { const next = new Set(prev); next.delete(key); return next }), 2000)
  }

  const handleRecurring = (child_id, frequency, day_of_week, day_of_month) => {
    onSchedule(chore.id, child_id, frequency, day_of_week, day_of_month)
  }

  const finishRecurring = (child_id) => {
    const key = child_id
    setCooldowns(prev => new Set(prev).add(key))
    setPromptChild(null)
    setTimeout(() => setCooldowns(prev => { const next = new Set(prev); next.delete(key); return next }), 2000)
  }

  const hasSchedule = (child_id) => (chore.schedules || []).some(s => s.child_id === child_id)

  return (
    <div className="relative">
      <div ref={cardRef} className="bg-white/15 rounded-xl p-4 flex flex-col gap-3 h-full">
        <div className="flex items-start justify-between min-h-0">
          <div className="flex items-start gap-3 min-w-0 flex-1" onClick={onTap}>
            <span className="text-3xl shrink-0">{chore.emoji}</span>
            <div className="min-w-0">
              <div className="font-semibold text-base leading-tight">{chore.title}</div>
              {chore.description && (
                <div className="text-white/40 text-xs mt-0.5 truncate">{chore.description}</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-white font-semibold text-lg whitespace-nowrap">{chore.points} pts</span>
            <button onClick={onEdit} className="text-white/50 active:text-white/80 text-2xl leading-none">⚙</button>
          </div>
        </div>

        <div className="flex gap-2">
          {children.map(child => {
            const on = cooldowns.has(child.id)
            const scheduled = hasSchedule(child.id)
            const active = promptChild?.id === child.id
            return (
              <button
                key={child.id}
                onClick={() => setPromptChild(child)}
                disabled={on}
                className={`flex-1 py-3 rounded-lg text-base font-medium flex items-center justify-center gap-2 ${active ? 'ring-3 ring-pink-400' : ''} ${on ? 'bg-green-600/80 opacity-60' : scheduled ? 'bg-purple-600/80 active:bg-purple-600' : 'bg-blue-600/80 active:bg-blue-600'}`}
              >
                {on ? '✓' : <>
                  {child.avatar && <img src={buildAvatarSrc(child.avatar)} className="w-7 h-7 rounded-full" />}
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
                className={`flex-1 py-3 rounded-lg text-base font-medium ${on ? 'bg-green-600/80 opacity-60' : 'bg-white/10 active:bg-white/20'}`}
              >
                {on ? '✓' : 'Pool'}
              </button>
            )
          })()}
        </div>
      </div>

      {promptChild && (
        <div className="absolute left-2 right-2 top-full -mt-5 z-10">
          <RecurrencePrompt
            childName={promptChild.name}
            existingSchedules={(chore.schedules || []).filter(s => s.child_id === promptChild.id)}
            onOneTime={() => handleOneTime(promptChild.id)}
            onRecurring={(freq, dow, dom) => handleRecurring(promptChild.id, freq, dow, dom)}
            onDeleteSchedule={onDeleteSchedule}
            onDone={() => finishRecurring(promptChild.id)}
            onCancel={() => setPromptChild(null)}
          />
        </div>
      )}
    </div>
  )
}

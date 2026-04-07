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

export default function ChoreTemplateCard({ chore, children, onTap, onEdit, onAssign, onSchedule }) {
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
    const key = child_id
    setCooldowns(prev => new Set(prev).add(key))
    onSchedule(chore.id, child_id, frequency, day_of_week, day_of_month)
    setPromptChild(null)
    setTimeout(() => setCooldowns(prev => { const next = new Set(prev); next.delete(key); return next }), 2000)
  }

  const hasSchedule = (child_id) => (chore.schedules || []).some(s => s.child_id === child_id)

  return (
    <div ref={cardRef} className="bg-white/15 rounded-xl p-3 flex flex-col justify-between gap-2">
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

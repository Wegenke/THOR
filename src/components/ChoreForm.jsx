import { useEffect, useState } from 'react'
import { useKboard } from '../hooks/useKboard'
import { useKboardContext } from '../context/KboardContext'
import EmojiPicker from './EmojiPicker'

export default function ChoreForm({ initial, onSave, onCancel }) {
  const [emoji,          setEmoji]         = useState(initial?.emoji            ?? '🦺')
  const [title,          setTitle]         = useState(initial?.title            ?? '')
  const [points,         setPoints]        = useState(initial?.points != null   ? String(initial.points) : '')
  const [description,    setDescription]   = useState(initial?.description      ?? '')
  const [saving,         setSaving]        = useState(false)

  const [emojiOpen, setEmojiOpen] = useState(false)

  const kb = useKboardContext()
  const titleKbRaw  = useKboard(title,          setTitle)
  const pointsKbRaw = useKboard(points,         setPoints,        { mode: 'numeric' })
  const descKbRaw   = useKboard(description,    setDescription)

  const closeEmojiOnFocus = (kbProps) => ({
    ...kbProps,
    onFocus: (...args) => { setEmojiOpen(false); kbProps.onFocus(...args) }
  })
  const titleKb  = closeEmojiOnFocus(titleKbRaw)
  const pointsKb = closeEmojiOnFocus(pointsKbRaw)
  const descKb   = closeEmojiOnFocus(descKbRaw)

  useEffect(() => () => kb?.dismiss(), [])

  const handleSave = () => {
    const data = { emoji, title, points: Number(points), description }
    if (!data.description) delete data.description
    setSaving(true)
    onSave(data).catch(() => setSaving(false))
  }

  const valid = title.trim() && emoji.trim() && points !== '' && Number(points) >= 0 && Number(points) % 10 === 0

  return (
    <div className="bg-white/15 rounded-xl p-6 flex flex-col gap-3">
      {emojiOpen && (
        <EmojiPicker selected={emoji} onSelect={setEmoji} onClose={() => setEmojiOpen(false)} />
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => { kb?.dismiss(); setEmojiOpen(o => !o) }}
          className="w-16 bg-white/10 rounded-lg px-2 py-3 text-center text-3xl active:bg-white/20 shrink-0"
        >
          {emoji}
        </button>
        <input
          type="text"
          inputMode="none"
          value={title}
          {...titleKb}
          className="flex-1 bg-white/10 rounded-lg px-4 py-3 text-base outline-none placeholder:text-white/30"
          placeholder="Chore title"
          autoFocus
        />
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => setPoints(p => String(Math.max(0, (Number(p) || 0) - 10)))}
            disabled={!points || Number(points) <= 0}
            className="w-13 h-13 rounded-lg bg-rose-600/70 text-2xl font-bold disabled:opacity-30 active:bg-rose-600"
          >−</button>
          <input
            type="number"
            inputMode="none"
            value={points}
            {...pointsKb}
            className="w-20 bg-white/10 rounded-lg px-2 py-3 text-base outline-none placeholder:text-white/30 text-center appearance-none"
            placeholder="Pts"
          />
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => setPoints(p => String((Number(p) || 0) + 10))}
            className="w-13 h-13 rounded-lg bg-green-600/70 text-2xl font-bold active:bg-green-600"
          >+</button>
        </div>
      </div>
      <input
        type="text"
        inputMode="none"
        value={description}
        {...descKb}
        className="bg-white/10 rounded-lg px-4 py-3 text-base outline-none placeholder:text-white/30"
        placeholder="Description (optional)"
      />
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={!valid || saving}
          className="flex-1 py-3 rounded-lg bg-green-600/80 text-base font-medium disabled:opacity-40 active:bg-green-600"
        >
          {saving ? 'Saving…' : initial ? 'Update' : 'Create'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="flex-1 py-3 rounded-lg bg-white/10 text-base font-medium disabled:opacity-40 active:bg-white/20"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

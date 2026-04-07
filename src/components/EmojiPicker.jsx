import { useState } from 'react'
// Large Emoji List > default
// const CHORE_EMOJIS = [
//   '🧹','🧺','🧻','🧼','🧽','🪣','🪥','🛁','🚿','🚽',
//   '🍽️','🥄','🍴','🫙','🛒','🥦','🥕','🥗','🍳','🧊',
//   '🐕','🐈','🐾','🪴','💧','🌿','🌱','🌻','🌾','🍂',
//   '📚','✏️','📝','🎒','🖊️','📖','🎨','🎵','🧩','🎮',
//   '🚗','🪟','🪞','🪤','🔑','🏠','🛏️','🪑','🛋️','🏡',
//   '⚙️','🔧','🔨','🪛','🔩','🪚','💡','🔋','📦','🗑️',
//   '⭐','🏆','🎯','💰','💵','👏','✅','🌟','🎉','🥇',
// ]

// Abridged Emoji List > custom
const CHORE_EMOJIS = [
  '🧼','🧽','🪣','🪥','🚿','🧹','🐕','💩','🚶‍♂️','🛁',
  '🧻','🛁','🚽','🐓','🐔','🥚','🥦','💧','🧊','🍽️',
  '📚','✏️','📝','🎒','🖊️','📖','🎨','🍂','🍳','🛋️',
  '🦤','🛌','✅','🗑️','🪠','🌛','💤','🪛','🫙','🌻',
]

function splitEmojis(str) {
  if (!str) return []
  return [...new Intl.Segmenter().segment(str)].map(s => s.segment)
}

export default function EmojiPicker({ selected, onSelect, onClose }) {
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

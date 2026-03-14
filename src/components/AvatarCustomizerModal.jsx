import { useState, useRef, useCallback } from 'react'
import { buildAvatarSrc, AVATAR_STYLES } from '../utils/avatar'

const BG_COLORS    = [null, '38bdf8', 'a78bfa', 'f472b6', 'fb923c', '4ade80', '1e293b']
const SKIN_COLORS  = ['fce8d0', 'f5cfa0', 'c8956c', 'a66b3c', '7a4628', '4a2319']
const HAIR_COLORS  = ['090806', '2c1b18', '71491e', 'a55728', 'b78b3c', 'dba040', 'b0b0b0']
const EYE_COLORS   = ['000000', '2c1b18', '5b7dd9', '4a8b3c', '8b4a2c', '707070']
const HAT_COLORS   = ['000000', 'e45f36', '5b8dd9', '3d4451', '4caf50', 'e6b800', 'e91e8c']
const ROBOT_COLORS = ['5b8dd9', 'e45f36', '4caf50', 'e6b800', 'e91e8c', 'b04080', 'b0b0b0']
const TOP_COLORS   = [null, 'e45f36', '5b8dd9', '3d4451', '4caf50', 'e6b800', '090806']
const MOODS        = ['happy', 'superHappy', 'sad', 'surprised', 'angry', 'neutral']
const MOOD_LABELS  = { superHappy: 'Super Happy' }

// Keys that survive a style switch
const UNIVERSAL_KEYS = new Set(['style', 'seed', 'backgroundColor', 'flip'])

// HSV ↔ hex conversions
function hsvToHex(h, s, v) {
  const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)) }
  return [f(5), f(3), f(1)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
}
function hexToHsv(hex) {
  const h = (hex ?? 'ff0000').padStart(6, '0')
  const r = parseInt(h.slice(0,2),16)/255, g = parseInt(h.slice(2,4),16)/255, b = parseInt(h.slice(4,6),16)/255
  const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min
  let hue = 0
  if (d) {
    if (max === r) hue = 60 * (((g-b)/d) % 6)
    else if (max === g) hue = 60 * ((b-r)/d + 2)
    else hue = 60 * ((r-g)/d + 4)
  }
  return { h: (hue + 360) % 360, s: max ? d/max : 0, v: max }
}

// Drag helper — uses pointer capture so drags never leak to parent scroll handlers
function useDrag(onDrag) {
  const ref = useRef(null)
  const handlers = {
    onPointerDown(e) {
      e.currentTarget.setPointerCapture(e.pointerId)
      const rect = e.currentTarget.getBoundingClientRect()
      onDrag(
        Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
        Math.max(0, Math.min(1, (e.clientY - rect.top)  / rect.height))
      )
    },
    onPointerMove(e) {
      if (!(e.buttons & 1)) return
      const rect = e.currentTarget.getBoundingClientRect()
      onDrag(
        Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
        Math.max(0, Math.min(1, (e.clientY - rect.top)  / rect.height))
      )
    },
    style: { touchAction: 'none', userSelect: 'none' },
  }
  return { ref, ...handlers }
}

function ColorPickerPopover({ selected, onSelect, onClose }) {
  const init = hexToHsv(selected && selected !== 'transparent' ? selected : 'ff0000')
  const [h, setH] = useState(init.h)
  const [s, setS] = useState(init.s)
  const [v, setV] = useState(init.v)

  const hex     = hsvToHex(h, s, v)
  const hueOnly = hsvToHex(h, 1, 1)

  const svDrag  = useDrag(useCallback((x, y) => { setS(x); setV(1 - y) }, []))
  const hueDrag = useDrag(useCallback((_x, y) => { setH(y * 360) },       []))

  return (
    <div data-no-swipe className="fixed inset-0 z-70 flex items-center justify-center bg-black/60"
      onClick={onClose}
      style={{ touchAction: 'none' }}>
      <div className="bg-slate-700 rounded-2xl p-4 flex flex-col gap-3 w-72"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <span className="text-xs text-white/40 uppercase tracking-wide">Custom color</span>
          <button type="button" onClick={onClose} className="text-white/50 active:text-white/80 text-lg leading-none">✕</button>
        </div>

        {/* SV square + vertical hue strip side by side */}
        <div className="flex gap-3 items-stretch">

          {/* 2-D saturation / value square */}
          <div
            className="flex-1 rounded-xl relative overflow-hidden"
            style={{
              aspectRatio: '1',
              background: `linear-gradient(to top, #000, transparent),
                           linear-gradient(to right, #fff, #${hueOnly})`,
              ...svDrag.style,
            }}
            onPointerDown={svDrag.onPointerDown}
            onPointerMove={svDrag.onPointerMove}
          >
            <div className="absolute w-4 h-4 rounded-full border-2 border-white pointer-events-none"
              style={{ left: `${s*100}%`, top: `${(1-v)*100}%`,
                transform: 'translate(-50%, -50%)', boxShadow: '0 0 3px rgba(0,0,0,0.6)' }} />
          </div>

          {/* Vertical hue strip */}
          <div
            className="w-7 rounded-full relative overflow-hidden"
            style={{
              background: 'linear-gradient(to bottom,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)',
              ...hueDrag.style,
            }}
            onPointerDown={hueDrag.onPointerDown}
            onPointerMove={hueDrag.onPointerMove}
          >
            <div className="absolute left-1/2 w-5 h-5 rounded-full border-2 border-white pointer-events-none"
              style={{ top: `${(h/360)*100}%`, transform: 'translate(-50%, -50%)',
                backgroundColor: `#${hueOnly}`, boxShadow: '0 0 3px rgba(0,0,0,0.6)' }} />
          </div>

        </div>

        {/* Preview + confirm */}
        <div className="flex gap-3 items-center">
          <div className="w-12 h-12 rounded-xl border-2 border-white/20 shrink-0"
            style={{ backgroundColor: `#${hex}` }} />
          <button type="button" onClick={() => { onSelect(hex); onClose() }}
            className="flex-1 py-3 rounded-xl bg-indigo-600/80 text-sm font-medium active:bg-indigo-600">
            Select
          </button>
        </div>

      </div>
    </div>
  )
}

function SwatchRow({ label, colors, selected, onChange }) {
  const [showPicker, setShowPicker] = useState(false)
  const isCustom = selected != null && selected !== 'transparent' && !colors.includes(selected)

  return (
    <>
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-white/40 uppercase tracking-wide">{label}</span>
      <div className="flex gap-2 flex-wrap items-center">

        {/* Custom color picker button */}
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          style={isCustom ? { backgroundColor: `#${selected}` } : undefined}
          className={`w-8 h-8 rounded-full border-2 transition-transform flex items-center justify-center
            ${isCustom ? 'border-white scale-110' : 'border-transparent bg-white/10 active:bg-white/20'}`}
        >
          <span className="text-[10px] leading-none">🎨</span>
        </button>

        {/* Preset swatches */}
        {colors.map(color => (
          <button
            key={color ?? 'none'}
            type="button"
            onClick={() => onChange(selected === color ? null : color)}
            style={color ? { backgroundColor: `#${color}` } : undefined}
            className={`w-8 h-8 rounded-full border-2 transition-transform flex items-center justify-center
              ${!color ? 'bg-white/10' : ''}
              ${selected === color
                ? 'border-white scale-110'
                : 'border-transparent opacity-60 active:opacity-100'}`}
          >
            {!color && <span className="text-white/50 text-xs leading-none">∅</span>}
          </button>
        ))}
      </div>
    </div>
    {showPicker && (
      <ColorPickerPopover
        selected={selected}
        onSelect={onChange}
        onClose={() => setShowPicker(false)}
      />
    )}
    </>
  )
}

function ToggleRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-white/40 uppercase tracking-wide">{label}</span>
      <div className="flex rounded-lg overflow-hidden bg-white/10">
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`px-4 py-1.5 text-sm font-medium
            ${!value ? 'bg-white/20 text-white' : 'text-white/50 active:bg-white/10'}`}
        >No</button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`px-4 py-1.5 text-sm font-medium
            ${value ? 'bg-white/20 text-white' : 'text-white/50 active:bg-white/10'}`}
        >Yes</button>
      </div>
    </div>
  )
}

function MoodRow({ value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-white/40 uppercase tracking-wide">Mood</span>
      <div className="flex gap-2 flex-wrap">
        {MOODS.map(mood => (
          <button
            key={mood}
            type="button"
            onClick={() => onChange(value === mood ? null : mood)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize
              ${value === mood
                ? 'bg-indigo-600/80 text-white'
                : 'bg-white/10 text-white/50 active:bg-white/20'}`}
          >
            {MOOD_LABELS[mood] ?? mood}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function AvatarCustomizerModal({ initialAvatar, onSelect, onClose }) {
  const [avatar, setAvatar] = useState(
    initialAvatar ?? { style: 'pixel-art', seed: Math.random().toString(36).slice(2, 10) }
  )

  const style = avatar.style ?? 'pixel-art'

  const setColor = (key, color) => {
    setAvatar(a => {
      if (!color) {
        const { [key]: _removed, ...rest } = a
        return rest
      }
      return { ...a, [key]: [color] }
    })
  }

  const switchStyle = (newStyle) => {
    setAvatar(a => {
      const kept = {}
      for (const key of UNIVERSAL_KEYS) {
        if (key in a) kept[key] = a[key]
      }
      return { ...kept, style: newStyle }
    })
  }

  const randomize = () => {
    setAvatar(a => ({ ...a, seed: Math.random().toString(36).slice(2, 10) }))
  }

  const toggleProp = (key, on) => {
    setAvatar(a => {
      if (!on) {
        const { [key]: _removed, ...rest } = a
        return rest
      }
      return { ...a, [key]: 100 }
    })
  }

  const toggleHat = (on) => {
    setAvatar(a => {
      if (!on) {
        const { hatProbability: _p, hatColor: _c, ...rest } = a
        return rest
      }
      return { ...a, hatProbability: 100, hatColor: ['000000'] }
    })
  }

  const setMood = (mood) => {
    setAvatar(a => {
      if (!mood) {
        const { mood: _removed, ...rest } = a
        return rest
      }
      return { ...a, mood: [mood] }
    })
  }

  const glassesOn  = avatar.glassesProbability === 100
  const hatOn      = avatar.hatProbability === 100
  const beardOn    = avatar.beardProbability === 100
  const mustacheOn = avatar.mustacheProbability === 100
  const facialOn   = avatar.facialHairProbability === 100
  const earringsOn = avatar.earringsProbability === 100
  const flipOn     = avatar.flip === true
  const baldOn     = avatar.top?.[0] === 'variant28'

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70"
      onClick={onClose}>
      <div className="w-96 bg-slate-800 rounded-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}>

        {/* Sticky header: title + preview/randomize */}
        <div className="p-5 pb-4 flex flex-col gap-4 shrink-0">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Customize Avatar</span>
            <button onClick={onClose} className="text-white/50 active:text-white/80 text-lg">✕</button>
          </div>
          <div className="flex items-center gap-4">
            <img src={buildAvatarSrc(avatar)} alt="preview" className="w-24 h-24 rounded-full bg-white/10 shrink-0" />
            <button type="button" onClick={randomize}
              className="flex-1 py-3 rounded-xl bg-white/10 text-sm font-medium active:bg-white/20">
              Randomize
            </button>
          </div>
        </div>

        {/* Scrollable options */}
        <div className="flex flex-col gap-4 overflow-y-auto scrollbar-hide px-5 pb-5">

        {/* Style picker */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-white/40 uppercase tracking-wide">Style</span>
          <div className="grid grid-cols-3 gap-2">
            {AVATAR_STYLES.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => switchStyle(s.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-colors
                  ${style === s.id
                    ? 'border-indigo-400 bg-white/10'
                    : 'border-transparent bg-white/5 active:bg-white/10'}`}
              >
                <img
                  src={buildAvatarSrc({ style: s.id, seed: avatar.seed })}
                  alt={s.label}
                  className="w-12 h-12 rounded-full"
                />
                <span className="text-xs text-white/60">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Universal: background color */}
        <SwatchRow
          label="Background"
          colors={BG_COLORS}
          selected={avatar.backgroundColor?.[0] ?? null}
          onChange={(c) => setColor('backgroundColor', c)}
        />

        {/* pixel-art: colors first, toggles + conditional hat color at bottom */}
        {style === 'pixel-art' && (<>
          <SwatchRow label="Skin"      colors={SKIN_COLORS} selected={avatar.skinColor?.[0]}  onChange={(c) => setColor('skinColor', c)} />
          <SwatchRow label="Hair"      colors={HAIR_COLORS} selected={avatar.hairColor?.[0]}  onChange={(c) => setColor('hairColor', c)} />
          <SwatchRow label="Eye Color" colors={EYE_COLORS}  selected={avatar.eyesColor?.[0]}  onChange={(c) => setColor('eyesColor', c)} />
          <ToggleRow label="Glasses"   value={glassesOn}    onChange={(on) => toggleProp('glassesProbability', on)} />
          <ToggleRow label="Hat"       value={hatOn}        onChange={toggleHat} />
          {hatOn && (
            <SwatchRow label="Hat Color" colors={HAT_COLORS} selected={avatar.hatColor?.[0]} onChange={(c) => setColor('hatColor', c)} />
          )}
        </>)}

        {/* adventurer: colors first, toggles at bottom */}
        {style === 'adventurer' && (<>
          <SwatchRow label="Skin"      colors={SKIN_COLORS} selected={avatar.skinColor?.[0]}  onChange={(c) => setColor('skinColor', c)} />
          <SwatchRow label="Hair"      colors={HAIR_COLORS} selected={avatar.hairColor?.[0]}  onChange={(c) => setColor('hairColor', c)} />
          <SwatchRow label="Eye Color" colors={EYE_COLORS}  selected={avatar.eyesColor?.[0]}  onChange={(c) => setColor('eyesColor', c)} />
          <ToggleRow label="Glasses"   value={glassesOn}    onChange={(on) => toggleProp('glassesProbability', on)} />
          <ToggleRow label="Earrings"  value={earringsOn}   onChange={(on) => toggleProp('earringsProbability', on)} />
        </>)}

        {/* bottts: color only */}
        {style === 'bottts' && (
          <SwatchRow label="Base Color" colors={ROBOT_COLORS} selected={avatar.baseColor?.[0]} onChange={(c) => setColor('baseColor', c)} />
        )}

        {/* croodles: color first, toggles at bottom */}
        {style === 'croodles' && (<>
          <SwatchRow
            label="Hair/Hat Color"
            colors={TOP_COLORS}
            selected={avatar.topColor?.[0] === 'transparent' ? null : avatar.topColor?.[0]}
            onChange={(c) => setAvatar(a => ({ ...a, topColor: [c ?? 'transparent'] }))}
          />
          <ToggleRow label="Bald"     value={baldOn}     onChange={(on) => setAvatar(a => { if (on) return { ...a, top: ['variant28'] }; const { top: _t, ...rest } = a; return rest })} />
          <ToggleRow label="Beard"    value={beardOn}    onChange={(on) => toggleProp('beardProbability', on)} />
          <ToggleRow label="Mustache" value={mustacheOn} onChange={(on) => toggleProp('mustacheProbability', on)} />
        </>)}

        {/* dylan: colors + mood first, toggle at bottom */}
        {style === 'dylan' && (<>
          <SwatchRow label="Skin" colors={SKIN_COLORS} selected={avatar.skinColor?.[0]} onChange={(c) => setColor('skinColor', c)} />
          <SwatchRow label="Hair" colors={HAIR_COLORS} selected={avatar.hairColor?.[0]} onChange={(c) => setColor('hairColor', c)} />
          <MoodRow value={avatar.mood?.[0]} onChange={setMood} />
          <ToggleRow label="Facial Hair" value={facialOn} onChange={(on) => toggleProp('facialHairProbability', on)} />
        </>)}

        {/* Universal flip toggle — always last before actions */}
        <ToggleRow
          label="Flip"
          value={flipOn}
          onChange={(on) => setAvatar(a => ({ ...a, flip: on }))}
        />

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/10 text-sm font-medium active:bg-white/20">
            Cancel
          </button>
          <button type="button" onClick={() => onSelect(avatar)}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600/80 text-sm font-medium active:bg-indigo-600">
            Select
          </button>
        </div>

        </div>{/* end scrollable options */}
      </div>
    </div>
  )
}

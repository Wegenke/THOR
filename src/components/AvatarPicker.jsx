import { createAvatar } from '@dicebear/core'
import { pixelArt } from '@dicebear/collection'

const SEEDS = [
  'Felix', 'Luna', 'Nemo', 'Pixel', 'Ziggy',
  'Cleo', 'Rex', 'Mochi', 'Nova', 'Blaze',
  'Jade', 'Orbit', 'Cosmo', 'Sparky', 'Quinn',
  'Echo', 'Sage', 'Comet', 'Storm', 'Ivy'
]

function toSrc(seed) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(createAvatar(pixelArt, { seed }).toString())}`
}

export default function AvatarPicker({ value, onChange }) {
  const selected = value?.seed
  return (
    <div className="grid grid-cols-5 gap-2">
      {SEEDS.map(seed => (
        <button
          key={seed}
          type="button"
          onClick={() => onChange({ style: 'pixel-art', seed })}
          className={`rounded-full transition-opacity
            ${selected === seed
              ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-800'
              : 'opacity-50 active:opacity-100'}`}
        >
          <img src={toSrc(seed)} alt={seed} className="w-full h-auto rounded-full block" />
        </button>
      ))}
    </div>
  )
}

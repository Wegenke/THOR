// Shared slide-in filter panel. Compose with FilterSection + FilterOption.
// Caller controls active-state and onClick on each option.

export default function FilterPanel({
  show,
  onClose,
  side = 'left',
  title,
  hasActiveFilters,
  onClear,
  children
}) {
  return (
    <div className={`fixed inset-0 z-50 ${show ? '' : 'pointer-events-none'}`}>
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div className={`absolute ${side === 'left' ? 'left-0' : 'right-0'}
        w-72 bg-slate-800 p-5 flex flex-col rounded-xl
        transform transition-transform duration-300
        ${show ? 'translate-x-0' : side === 'left' ? '-translate-x-full' : 'translate-x-full'}`}
        style={{ top: '7rem', bottom: '1.5rem' }}
      >
        <div className={`flex items-center ${side === 'left' ? 'justify-between' : 'flex-row-reverse justify-between'} mb-6`}>
          <span className="font-semibold">{title}</span>
          <button onClick={onClose} className="text-white/50 active:text-white/80 text-lg">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-6">
          {children}
        </div>

        <div className="pt-4">
          <button
            onClick={() => { onClear(); onClose() }}
            className={`w-full py-2.5 rounded-xl text-sm font-medium bg-white/10 active:bg-white/20
              ${hasActiveFilters ? '' : 'invisible'}`}
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  )
}

export function FilterSection({ title, children }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">{title}</span>
      {children}
    </div>
  )
}

export function FilterOption({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 py-3 px-2 rounded-lg active:bg-white/15 transition-colors text-left
        ${active ? 'bg-white/10' : ''}`}
    >
      {children}
    </button>
  )
}

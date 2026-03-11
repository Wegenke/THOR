import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { createSetup } from '../api/setup'

export default function SetupView({ onComplete }) {
  const [householdName, setHouseholdName] = useState('')
  const [parentName, setParentName] = useState('')
  const [nickName, setNickName] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')

  const pinTooShort = pin.length > 0 && pin.length < 4
  const pinMismatch = confirmPin.length > 0 && pin !== confirmPin
  const canSubmit = householdName.trim() && parentName.trim() && pin.length >= 4 && pin === confirmPin

  const { mutate, isPending } = useMutation({
    mutationFn: createSetup,
    onSuccess: onComplete,
    onError: (err) => {
      setError(err.response?.status === 403
        ? 'Setup has already been completed.'
        : 'Something went wrong. Please try again.')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setError('')
    mutate({
      household: { name: householdName.trim() },
      user: {
        name: parentName.trim(),
        ...(nickName.trim() && { nick_name: nickName.trim() }),
        avatar: { style: 'pixel-art', seed: parentName.trim() },
        pin
      }
    })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
      <div className="flex flex-col gap-6 w-full max-w-md p-8">
        <div>
          <h1 className="text-2xl font-bold">Welcome</h1>
          <p className="text-white/60 mt-1">Set up your household to get started.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Household Name</label>
            <input type="text" value={householdName} onChange={e => setHouseholdName(e.target.value)}
              placeholder="e.g. Smith Family"
              className="px-4 py-3 rounded-lg bg-white/10 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Your Name</label>
            <input type="text" value={parentName} onChange={e => setParentName(e.target.value)}
              placeholder="e.g. Homer"
              className="px-4 py-3 rounded-lg bg-white/10 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Nickname <span className="text-white/40">(optional)</span></label>
            <input type="text" value={nickName} onChange={e => setNickName(e.target.value)}
              placeholder="e.g. Dad"
              className="px-4 py-3 rounded-lg bg-white/10 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">PIN <span className="text-white/40">(4–8 digits)</span></label>
            <input type="password" inputMode="numeric" maxLength={8}
              value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="px-4 py-3 rounded-lg bg-white/10 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30" />
            {pinTooShort && <span className="text-red-400 text-sm">PIN must be at least 4 digits</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Confirm PIN</label>
            <input type="password" inputMode="numeric" maxLength={8}
              value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="px-4 py-3 rounded-lg bg-white/10 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30" />
            {pinMismatch && <span className="text-red-400 text-sm">PINs don't match</span>}
          </div>

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <button type="submit" disabled={!canSubmit || isPending}
            className="mt-2 py-3 rounded-lg bg-white text-slate-900 font-semibold disabled:opacity-30">
            {isPending ? 'Creating…' : 'Create Household'}
          </button>
        </form>
      </div>
    </div>
  )
}

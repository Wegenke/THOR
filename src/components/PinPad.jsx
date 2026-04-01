import { useState } from 'react'
import { buildAvatarSrc } from '../utils/avatar'
import { login } from '../api/auth'
import { useAuth } from '../context/AuthContext'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'submit']

export default function PinPad({ user, onLockout, onBack }) {
  const { login: setUser } = useAuth()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const avatarSrc = buildAvatarSrc(user.avatar)

  const handleKey = (key) => {
    if (submitting) return
    if (key === 'del') {
      setPin(p => p.slice(0, -1))
      setError('')
    } else if (key === 'submit') {
      if (pin.length >= 4) handleSubmit(pin)
    } else if (pin.length < 8) {
      setPin(p => p + key)
      setError('')
    }
  }

  const handleSubmit = async (currentPin) => {
    setSubmitting(true)
    try {
      const userData = await login(user.id, currentPin)
      setUser(userData)
    } catch (err) {
      setPin('')
      if (err.response?.status === 429) {
        onLockout(user.id)
      } else {
        setError('Wrong PIN')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex gap-28 items-center">

      {/* Left: user card + dots + back */}
      <div className="flex flex-col items-center gap-10 w-96">
        <div className="flex flex-col items-center gap-6 p-12 bg-white/15 rounded-3xl w-full">
          <img src={avatarSrc} alt={user.name} className="w-48 h-48 rounded-full" />
          <span className="text-4xl font-semibold">{user.nick_name || user.name}</span>
        </div>

        <div className="flex gap-4 h-7 items-center">
          {Array.from({ length: pin.length }, (_, i) => (
            <div key={i} className="w-6 h-6 rounded-full bg-white" />
          ))}
        </div>

        {error && <div className="text-red-400 text-xl">{error}</div>}

        <button
          onClick={onBack}
          className="w-full py-5 rounded-xl bg-red-950/60 text-red-400 text-xl font-medium active:bg-red-900/60"
        >
          Back
        </button>
      </div>

      {/* Right: keypad */}
      <div className="grid grid-cols-3 gap-7">
        {KEYS.map((key) => {
          if (key === 'submit') return (
            <button
              key="submit"
              onClick={() => handleKey('submit')}
              disabled={pin.length < 4 || submitting}
              className={`w-44 h-44 rounded-full text-5xl font-medium disabled:opacity-30 transition-colors ${pin.length >= 4 ? 'bg-green-600/80 active:bg-green-600' : 'bg-white/20'
                }`}
            >
              ✓
            </button>
          )
          if (key === 'del') return (
            <button
              key="del"
              onClick={() => handleKey('del')}
              disabled={submitting}
              className="w-44 h-44 rounded-full bg-white/20 text-orange-300 text-5xl font-medium disabled:opacity-50"
            >
              ⌫
            </button>
          )
          return (
            <button
              key={key}
              onClick={() => handleKey(key)}
              disabled={submitting}
              className="w-44 h-44 rounded-full bg-white/20 text-5xl font-medium disabled:opacity-50"
            >
              {key}
            </button>
          )
        })}
      </div>


    </div>
  )
}

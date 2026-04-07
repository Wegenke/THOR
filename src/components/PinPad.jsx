import { useState, useRef } from 'react'
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
  const activeKeyRef = useRef(null)

  const handlePointerDown = (key, e) => {
    if (submitting) return
    activeKeyRef.current = key
    e.target.setPointerCapture(e.pointerId)
  }

  const handlePointerUp = (key) => {
    if (submitting || activeKeyRef.current !== key) return
    activeKeyRef.current = null
    handleKey(key)
  }

  const handlePointerCancel = () => {
    activeKeyRef.current = null
  }

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
    <div className="flex gap-24 items-center">

      {/* Left: user card + dots + back */}
      <div className="flex flex-col items-center gap-8 w-80">
        <div className="flex flex-col items-center gap-5 p-10 bg-white/15 rounded-3xl w-full">
          <img src={avatarSrc} alt={user.name} className="w-40 h-40 rounded-full" />
          <span className="text-3xl font-semibold">{user.nick_name || user.name}</span>
        </div>

        <div className="flex gap-4 h-6 items-center">
          {Array.from({ length: pin.length }, (_, i) => (
            <div key={i} className="w-5 h-5 rounded-full bg-white" />
          ))}
        </div>

        {error && <div className="text-red-400 text-lg">{error}</div>}

        <button
          onClick={onBack}
          className="w-full py-4 rounded-xl bg-red-950/60 text-red-400 text-lg font-medium active:bg-red-900/60"
        >
          Back
        </button>
      </div>

      {/* Right: keypad */}
      <div className="grid grid-cols-3 gap-6">
        {KEYS.map((key) => {
          if (key === 'submit') return (
            <button
              key="submit"
              onPointerDown={(e) => handlePointerDown('submit', e)}
              onPointerUp={() => handlePointerUp('submit')}
              onPointerCancel={handlePointerCancel}
              disabled={pin.length < 4 || submitting}
              className={`w-36 h-36 rounded-full text-4xl font-medium disabled:opacity-30 transition-colors ${pin.length >= 4 ? 'bg-green-600/80 active:bg-green-600' : 'bg-white/20'
                }`}
            >
              ✓
            </button>
          )
          if (key === 'del') return (
            <button
              key="del"
              onPointerDown={(e) => handlePointerDown('del', e)}
              onPointerUp={() => handlePointerUp('del')}
              onPointerCancel={handlePointerCancel}
              disabled={submitting}
              className="w-36 h-36 rounded-full bg-white/20 text-orange-300 text-4xl font-medium disabled:opacity-50"
            >
              ⌫
            </button>
          )
          return (
            <button
              key={key}
              onPointerDown={(e) => handlePointerDown(key, e)}
              onPointerUp={() => handlePointerUp(key)}
              onPointerCancel={handlePointerCancel}
              disabled={submitting}
              className="w-36 h-36 rounded-full bg-white/20 text-4xl font-medium disabled:opacity-50"
            >
              {key}
            </button>
          )
        })}
      </div>


    </div>
  )
}

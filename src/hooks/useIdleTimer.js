import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function useIdleTimer(timeout = 5 * 60 * 1000) {
  const { logout } = useAuth()

  useEffect(() => {
    let timer = setTimeout(logout, timeout)

    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(logout, timeout)
    }

    const events = ['touchstart', 'mousedown', 'keydown']
    events.forEach(e => document.addEventListener(e, reset, { passive: true }))

    return () => {
      clearTimeout(timer)
      events.forEach(e => document.removeEventListener(e, reset))
    }
  }, [logout, timeout])
}

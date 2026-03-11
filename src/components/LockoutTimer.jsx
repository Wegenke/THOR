import { useEffect, useState } from 'react'

export default function LockoutTimer({ expiresAt, onExpired }) {
  const [seconds, setSeconds] = useState(() => Math.ceil((expiresAt - Date.now()) / 1000))

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.ceil((expiresAt - Date.now()) / 1000)
      if (remaining <= 0) {
        clearInterval(interval)
        onExpired()
      } else {
        setSeconds(remaining)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [expiresAt, onExpired])

  return <span className="text-sm tabular-nums">{seconds}s</span>
}

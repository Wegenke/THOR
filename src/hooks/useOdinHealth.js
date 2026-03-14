import { useState, useEffect, useRef } from 'react'
import client from '../api/client'

export default function useOdinHealth(interval = 10000) {
  const [connected, setConnected] = useState(true)
  const checkedOnce = useRef(false)

  useEffect(() => {
    const check = () => {
      client.get('/health')
        .then(() => { checkedOnce.current = true; setConnected(true) })
        .catch(() => { if (checkedOnce.current) setConnected(false) })
    }

    check()
    const id = setInterval(check, interval)
    return () => clearInterval(id)
  }, [interval])

  return connected
}

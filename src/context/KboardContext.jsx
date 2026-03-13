import { createContext, useContext, useRef, useState } from 'react'

export const KboardContext = createContext(null)

const isTouchDevice =
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0)

export function KboardProvider({ children }) {
  const [visible, setVisible] = useState(false)
  const [shielded, setShielded] = useState(false)
  const [mode, setMode] = useState('text')
  const [initValue, setInitValue] = useState('')
  const setterRef = useRef(null)
  const blurTimerRef = useRef(null)
  const shieldTimerRef = useRef(null)
  const keyboardRef = useRef(null)

  const register = (value, setter, inputMode) => {
    if (!isTouchDevice) return
    clearTimeout(blurTimerRef.current)
    setterRef.current = setter
    setMode(inputMode === 'numeric' ? 'numeric' : 'text')
    setInitValue(value ?? '')
    setVisible(true)
    // If the keyboard is already mounted, sync its internal buffer immediately.
    // The keyboardRef callback only fires on mount, not on re-render, so without
    // this the buffer retains the previous field's value when switching fields.
    if (keyboardRef.current) keyboardRef.current.setInput(value ?? '')
  }

  const unregister = () => {
    if (!isTouchDevice) return
    blurTimerRef.current = setTimeout(() => {
      setVisible(false)
      setterRef.current = null
    }, 200)
  }

  const syncValue = (val) => {
    if (keyboardRef.current) keyboardRef.current.setInput(val)
  }

  const handleKeyboard = (val) => {
    if (setterRef.current) setterRef.current(val)
  }

  const dismiss = () => {
    clearTimeout(blurTimerRef.current)
    setterRef.current = null
    setVisible(false)
    // Render a transparent full-screen shield at z-[150] for 200ms to absorb
    // the ghost click that fires after the keyboard is gone, preventing it
    // from reaching modal backdrops at z-50.
    clearTimeout(shieldTimerRef.current)
    setShielded(true)
    shieldTimerRef.current = setTimeout(() => setShielded(false), 200)
  }

  return (
    <KboardContext.Provider value={{ visible, mode, initValue, register, unregister, syncValue, handleKeyboard, dismiss, keyboardRef }}>
      {children}
      {shielded && <div className="fixed inset-0 z-[150]" />}
    </KboardContext.Provider>
  )
}

export const useKboardContext = () => useContext(KboardContext)

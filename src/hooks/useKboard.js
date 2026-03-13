import { useContext } from 'react'
import { KboardContext } from '../context/KboardContext'

/**
 * Spreads onFocus, onBlur, onChange onto a controlled input or textarea.
 * On touch devices, shows the virtual keyboard when the field is focused.
 * Physical keyboard typing continues to work normally on all devices.
 *
 * @param {string} value   - Current controlled value
 * @param {Function} setter - State setter (e.g. setName)
 * @param {Object} options
 * @param {'text'|'numeric'} options.mode     - Keyboard layout (default 'text')
 * @param {number}           options.maxLength - Cap input length
 */
export function useKboard(value, setter, options = {}) {
  const kb = useContext(KboardContext)

  const cap = options.maxLength
    ? (val) => setter(String(val).slice(0, options.maxLength))
    : setter

  return {
    onFocus: () => kb?.register(value, cap, options.mode ?? 'text'),
    onBlur:  () => kb?.unregister(),
    onChange: (e) => {
      const val = options.maxLength
        ? e.target.value.slice(0, options.maxLength)
        : e.target.value
      setter(val)
      kb?.syncValue(val)
    }
  }
}

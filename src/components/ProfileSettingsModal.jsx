import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { buildAvatarSrc } from '../utils/avatar'
import { useAuth } from '../context/AuthContext'
import { updateMe } from '../api/users'
import { useKboard } from '../hooks/useKboard'
import AvatarCustomizerModal from './AvatarCustomizerModal'

export default function ProfileSettingsModal({ onClose }) {
  const { user, updateUser } = useAuth()

  const [avatar, setAvatar] = useState(user.avatar ?? null)
  const [showCustomizer, setShowCustomizer] = useState(false)
  const [nickName, setNickName] = useState(user.nick_name ?? '')
  const [showPin, setShowPin] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')

  const nickKb       = useKboard(nickName, setNickName)
  const newPinKb     = useKboard(newPin, setNewPin, { mode: 'numeric', maxLength: 8 })
  const confirmPinKb = useKboard(confirmPin, setConfirmPin, { mode: 'numeric', maxLength: 8 })

  const avatarSrc = buildAvatarSrc(avatar)

  const mutation = useMutation({
    mutationFn: (data) => updateMe(data),
    onSuccess: (updated) => {
      updateUser({ nick_name: updated.nick_name, avatar: updated.avatar })
      onClose()
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (showPin && newPin !== confirmPin) return
    const data = {}
    if (nickName !== (user.nick_name ?? '')) data.nick_name = nickName
    if (showPin && newPin) data.pin = newPin
    if (JSON.stringify(avatar) !== JSON.stringify(user.avatar)) data.avatar = avatar
    if (Object.keys(data).length === 0) { onClose(); return }
    mutation.mutate(data)
  }

  const pinMismatch = showPin && confirmPin && newPin !== confirmPin

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}>
      <div className="w-88 bg-slate-800 rounded-2xl p-5 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <span className="font-semibold">Profile Settings</span>
          <button onClick={onClose} className="text-white/50 active:text-white/80 text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">

          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            {avatarSrc
              ? <img src={avatarSrc} alt="avatar" className="w-16 h-16 rounded-full bg-white/10" />
              : <div className="w-16 h-16 rounded-full bg-white/10" />
            }
            <button type="button" onClick={() => setShowCustomizer(true)}
              className="text-xs text-indigo-400/80 active:text-indigo-300">
              Change Avatar
            </button>
          </div>

          {/* Nickname */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/50">Nickname <span className="text-white/30">(optional)</span></label>
            <input
              type="text"
              inputMode="none"
              value={nickName}
              {...nickKb}
              className="bg-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-white/30"
            />
          </div>

          {/* PIN change */}
          {!showPin ? (
            <button type="button" onClick={() => setShowPin(true)}
              className="text-sm text-indigo-400/80 active:text-indigo-300 text-left">
              + Change PIN
            </button>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/50">New PIN</label>
                <input
                  type="text"
                  inputMode="none"
                  value={newPin}
                  {...newPinKb}
                  minLength={4}
                  maxLength={8}
                  placeholder="4–8 digits"
                  className="bg-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-white/30"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/50">Confirm new PIN</label>
                <input
                  type="text"
                  inputMode="none"
                  value={confirmPin}
                  {...confirmPinKb}
                  minLength={4}
                  maxLength={8}
                  placeholder="4–8 digits"
                  className={`bg-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1
                    ${pinMismatch ? 'ring-1 ring-red-500/60' : 'focus:ring-white/30'}`}
                />
                {pinMismatch && <span className="text-xs text-red-400">PINs don't match</span>}
              </div>
            </>
          )}

          {mutation.isError && (
            <p className="text-xs text-red-400">{mutation.error?.response?.data?.message ?? 'Something went wrong'}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-white/10 text-sm font-medium active:bg-white/20">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending || pinMismatch}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600/80 text-sm font-medium disabled:opacity-40 active:bg-indigo-600">
              Save
            </button>
          </div>

        </form>
      </div>
    </div>

    {showCustomizer && (
      <AvatarCustomizerModal
        initialAvatar={avatar}
        onSelect={(a) => { setAvatar(a); setShowCustomizer(false) }}
        onClose={() => setShowCustomizer(false)}
      />
    )}
    </>
  )
}

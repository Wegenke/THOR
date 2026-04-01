import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { buildAvatarSrc } from '../utils/avatar'
import { createUser, updateUser, deleteUser } from '../api/users'
import { useKboard } from '../hooks/useKboard'
import AvatarCustomizerModal from './AvatarCustomizerModal'

export default function UserForm({ user, onClose }) {
  const isEdit = !!user
  const queryClient = useQueryClient()

  const [avatar, setAvatar] = useState(user?.avatar ?? { style: 'pixel-art', seed: Math.random().toString(36).slice(2, 10) })
  const [showCustomizer, setShowCustomizer] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [nickName, setNickName] = useState(user?.nick_name ?? '')
  const [role, setRole] = useState(user?.role ?? 'child')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(!isEdit)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)

  const nameKb     = useKboard(name, setName)
  const nickNameKb = useKboard(nickName, setNickName)
  const pinKb      = useKboard(pin, setPin, { mode: 'numeric', maxLength: 8 })

  const canDeactivate = isEdit && user.role === 'child'

  const deactivate = useMutation({
    mutationFn: () => deleteUser(user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'parent'] })
      onClose()
    }
  })

  const avatarPreviewSrc = buildAvatarSrc(avatar)

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? updateUser(user.id, data) : createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'parent'] })
      onClose()
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isEdit) {
      const data = {}
      if (name !== user.name) data.name = name
      if (nickName !== (user.nick_name ?? '')) data.nick_name = nickName
      if (role !== user.role) data.role = role
      if (pin) data.pin = pin
      if (JSON.stringify(avatar) !== JSON.stringify(user.avatar)) data.avatar = avatar
      mutation.mutate(data)
    } else {
      mutation.mutate({
        name: name.trim(),
        nick_name: nickName.trim() || undefined,
        role,
        pin,
        avatar
      })
    }
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}>
      <div className="w-96 bg-slate-800 rounded-2xl p-5 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <span className="font-semibold">{isEdit ? 'Edit User' : 'Add User'}</span>
          <button onClick={onClose} className="text-white/50 active:text-white/80 text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">

          {/* Avatar preview */}
          <div className="flex flex-col items-center gap-2">
            <img src={avatarPreviewSrc} alt="avatar preview" className="w-16 h-16 rounded-full bg-white/10" />
            <button type="button" onClick={() => setShowCustomizer(true)}
              className="text-xs text-indigo-400/80 active:text-indigo-300">
              Change Avatar
            </button>
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/50">Name</label>
            <input
              type="text"
              inputMode="none"
              value={name}
              {...nameKb}
              required
              className="bg-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-white/30"
            />
          </div>

          {/* Nickname */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/50">Nickname <span className="text-white/30">(optional)</span></label>
            <input
              type="text"
              inputMode="none"
              value={nickName}
              {...nickNameKb}
              className="bg-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-white/30"
            />
          </div>

          {/* Role */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/50">Role</label>
            <div className="flex rounded-lg overflow-hidden bg-white/10">
              {['child', 'parent'].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 py-2 text-sm font-medium capitalize transition-colors
                    ${role === r ? 'bg-indigo-600 text-white' : 'text-white/50 active:bg-white/10'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* PIN */}
          {isEdit ? (
            <div className="flex flex-col gap-1">
              {!showPin ? (
                <button type="button" onClick={() => setShowPin(true)}
                  className="text-sm text-indigo-400/80 active:text-indigo-300 text-left">
                  + Reset PIN
                </button>
              ) : (
                <>
                  <label className="text-xs text-white/50">New PIN</label>
                  <input
                    type="text"
                    inputMode="none"
                    value={pin}
                    {...pinKb}
                    minLength={4}
                    maxLength={8}
                    placeholder="4–8 digits"
                    className="bg-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-white/30"
                  />
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/50">PIN</label>
              <input
                type="text"
                inputMode="none"
                value={pin}
                {...pinKb}
                required
                minLength={4}
                maxLength={8}
                placeholder="4–8 digits"
                className="bg-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-white/30"
              />
            </div>
          )}

          {mutation.isError && (
            <p className="text-xs text-red-400">{mutation.error?.response?.data?.message ?? 'Something went wrong'}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-white/10 text-sm font-medium active:bg-white/20">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600/80 text-sm font-medium disabled:opacity-40 active:bg-indigo-600">
              {isEdit ? 'Save' : 'Create'}
            </button>
          </div>

          {canDeactivate && (
            <button type="button" onClick={() => setConfirmDeactivate(true)}
              className="w-full py-2 rounded-xl text-sm text-red-400/60 active:text-red-400">
              Deactivate User
            </button>
          )}

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

    {confirmDeactivate && (
      <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70">
        <div className="w-80 bg-slate-700 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-base">Deactivate {user.nick_name || user.name}?</span>
            <span className="text-sm text-white/50">This will remove them from the household. Their history will be preserved.</span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmDeactivate(false)}
              className="flex-1 py-2.5 rounded-xl bg-white/10 text-sm font-medium active:bg-white/20">
              Cancel
            </button>
            <button type="button" onClick={() => deactivate.mutate()} disabled={deactivate.isPending}
              className="flex-1 py-2.5 rounded-xl bg-red-700/80 text-sm font-medium disabled:opacity-40 active:bg-red-700">
              Deactivate
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

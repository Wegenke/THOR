import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createAvatar } from '@dicebear/core'
import { pixelArt } from '@dicebear/collection'
import { useAuth } from '../context/AuthContext'
import { getUsers, getRecentPinChanges } from '../api/users'
import UserForm from './UserForm'

function avatarSrc(avatar) {
  if (!avatar) return null
  const { style, ...options } = avatar
  return `data:image/svg+xml;utf8,${encodeURIComponent(createAvatar(pixelArt, options).toString())}`
}

function UserCard({ user, canEdit, onEdit }) {
  return (
    <div
      onClick={() => canEdit && onEdit(user)}
      className={`flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3
        ${canEdit ? 'active:bg-white/15 cursor-pointer' : 'opacity-60 cursor-default'}`}
    >
      {user.avatar ? (
        <img src={avatarSrc(user.avatar)} alt={user.name} className="w-10 h-10 rounded-full shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{user.nick_name || user.name}</div>
        {user.nick_name && (
          <div className="text-xs text-white/40 truncate">{user.name}</div>
        )}
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0
        ${user.role === 'parent'
          ? 'bg-violet-500/20 text-violet-300'
          : 'bg-sky-500/20 text-sky-300'}`}>
        {user.role}
      </span>
    </div>
  )
}

export default function ParentUsersTab() {
  const { user: me } = useAuth()
  const [editUser, setEditUser] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers
  })

  const { data: pinChanges = [] } = useQuery({
    queryKey: ['users', 'pin_changes'],
    queryFn: getRecentPinChanges
  })

  if (usersLoading) return null

  return (
    <div className="flex flex-col gap-4 max-w-lg mx-auto">

      {/* PIN change banner */}
      {pinChanges.length > 0 && (
        <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-300">
          <span className="font-medium">Recent PIN changes: </span>
          {pinChanges.map(u => u.nick_name || u.name).join(', ')}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/40 uppercase tracking-wider">
          Members ({users.length})
        </span>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 rounded-lg border border-white/20 text-xs text-white/60 active:border-white/40 active:text-white/80"
        >
          + Add User
        </button>
      </div>

      {/* User list */}
      <div className="flex flex-col gap-2">
        {users.map(u => (
          <UserCard
            key={u.id}
            user={u}
            canEdit={u.role === 'child' || u.id === me.id}
            onEdit={setEditUser}
          />
        ))}
      </div>

      {showCreate && <UserForm onClose={() => setShowCreate(false)} />}
      {editUser && <UserForm user={editUser} onClose={() => setEditUser(null)} />}

    </div>
  )
}

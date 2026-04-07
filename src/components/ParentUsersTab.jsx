import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { buildAvatarSrc } from '../utils/avatar'
import { useAuth } from '../context/AuthContext'
import { getUsers, getRecentPinChanges } from '../api/users'
import UserForm from './UserForm'
import AdjustPointsModal from './AdjustPointsModal'

function UserCard({ user, canEdit, onEdit, onAdjust }) {
  return (
    <div className={`flex items-center gap-4 bg-white/15 rounded-xl px-4 py-5
      ${canEdit ? 'cursor-pointer' : 'opacity-60 cursor-default'}`}
    >
      <div
        className="flex items-center gap-4 flex-1 min-w-0"
        onClick={() => canEdit && onEdit(user)}
      >
        {user.avatar ? (
          <img src={buildAvatarSrc(user.avatar)} alt={user.name} className="w-14 h-14 rounded-full shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-white/10 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{user.nick_name || user.name}</div>
          {user.nick_name && (
            <div className="text-xs text-white/40 truncate">{user.name}</div>
          )}
        </div>
      </div>
      {onAdjust && (
        <button
          onClick={onAdjust}
          className="px-3 py-2 rounded-lg bg-white/5 text-xs text-white/40 font-medium active:bg-white/10 shrink-0"
        >Adjust Pts</button>
      )}
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
  const [adjustChild, setAdjustChild] = useState(null)

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
            onAdjust={u.role === 'child' ? () => setAdjustChild(u) : undefined}
          />
        ))}
      </div>

      {showCreate && <UserForm onClose={() => setShowCreate(false)} />}
      {editUser && <UserForm user={editUser} onClose={() => setEditUser(null)} />}
      {adjustChild && <AdjustPointsModal child={adjustChild} onClose={() => setAdjustChild(null)} />}

    </div>
  )
}

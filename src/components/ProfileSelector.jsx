import { buildAvatarSrc } from '../utils/avatar'
import LockoutTimer from './LockoutTimer'

function ProfileRow({ profiles, onSelect, lockedUsers, onLockoutExpired }) {
  return (
    <div className="flex-1 flex items-center justify-center gap-8">
      {profiles.map(profile => {
        const isLocked = !!lockedUsers[profile.id]
        const avatarSrc = buildAvatarSrc(profile.avatar)
        return (
          <button
            key={profile.id}
            onClick={() => onSelect(profile)}
            disabled={isLocked}
            className="aspect-square h-full max-h-full flex flex-col items-center justify-center gap-3 rounded-full bg-white/15 disabled:opacity-50"
          >
            <img src={avatarSrc} alt={profile.name} className="w-1/2 h-1/2" />
            <span className="text-lg font-medium">{profile.name}</span>
            {isLocked && (
              <LockoutTimer
                expiresAt={lockedUsers[profile.id]}
                onExpired={() => onLockoutExpired(profile.id)}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

export default function ProfileSelector({ profiles, onSelect, lockedUsers, onLockoutExpired }) {
  const parents = profiles.filter(p => p.role === 'parent')
  const children = profiles.filter(p => p.role === 'child')

  // Split children into rows of max 4
  const childRows = []
  for (let i = 0; i < children.length; i += 4) {
    childRows.push(children.slice(i, i + 4))
  }

  const rows = [parents, ...childRows].filter(r => r.length > 0)

  return (
    <div className="flex flex-col gap-6 h-[80vh] w-full px-8">
      {rows.map((row, i) => (
        <ProfileRow
          key={i}
          profiles={row}
          onSelect={onSelect}
          lockedUsers={lockedUsers}
          onLockoutExpired={onLockoutExpired}
        />
      ))}
    </div>
  )
}

import { buildAvatarSrc } from '../utils/avatar'
import LockoutTimer from './LockoutTimer'

function ProfileGroup({ label, profiles, onSelect, lockedUsers, onLockoutExpired }) {
  return (
    <div className="flex-1 flex flex-col gap-4">
      <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider">{label}</h2>
      {profiles.length === 0 ? (
        <div className="text-white/20 text-sm">None</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {profiles.map(profile => {
            const isLocked = !!lockedUsers[profile.id]
            const avatarSrc = buildAvatarSrc(profile.avatar)
            return (
              <button
                key={profile.id}
                onClick={() => onSelect(profile)}
                disabled={isLocked}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/15 disabled:opacity-50"
              >
                <img src={avatarSrc} alt={profile.name} className="w-20 h-20" />
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
      )}
    </div>
  )
}

export default function ProfileSelector({ profiles, onSelect, lockedUsers, onLockoutExpired }) {
  const parents = profiles.filter(p => p.role === 'parent')
  const children = profiles.filter(p => p.role === 'child')

  return (
    <div className="flex gap-8 p-8 w-full">
      <ProfileGroup label="Parents" profiles={parents} onSelect={onSelect} lockedUsers={lockedUsers} onLockoutExpired={onLockoutExpired} />
      <div className="w-px bg-white/10 self-stretch" />
      <ProfileGroup label="Children" profiles={children} onSelect={onSelect} lockedUsers={lockedUsers} onLockoutExpired={onLockoutExpired} />
    </div>
  )
}

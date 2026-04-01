import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getProfiles } from '../api/auth'
import ProfileSelector from '../components/ProfileSelector'
import PinPad from '../components/PinPad'
import SetupView from './SetupView'

const LOCKOUT_DURATION_MS = 30 * 1000

export default function LoginView() {
  const [selectedUser, setSelectedUser] = useState(null)
  const [lockedUsers, setLockedUsers] = useState({})

  const queryClient = useQueryClient()
  const { data: profiles, isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: getProfiles
  })

  const handleSelect = (profile) => {
    if (lockedUsers[profile.id]) return
    setSelectedUser(profile)
  }

  const handleLockout = (userId) => {
    setLockedUsers(prev => ({ ...prev, [userId]: Date.now() + LOCKOUT_DURATION_MS }))
    setSelectedUser(null)
  }

  const handleLockoutExpired = (userId) => {
    setLockedUsers(prev => {
      const next = { ...prev }
      delete next[userId]
      return next
    })
  }

  if (isLoading) return null

  if (profiles.length === 0) return (
    <SetupView onComplete={() => queryClient.invalidateQueries({ queryKey: ['profiles'] })} />
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-app-gradient text-white">
      {selectedUser ? (
        <PinPad
          user={selectedUser}
          onLockout={handleLockout}
          onBack={() => setSelectedUser(null)}
        />
      ) : (
        <ProfileSelector
          profiles={profiles}
          onSelect={handleSelect}
          lockedUsers={lockedUsers}
          onLockoutExpired={handleLockoutExpired}
        />
      )}
    </div>
  )
}

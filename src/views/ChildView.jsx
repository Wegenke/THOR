import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSwipeable } from 'react-swipeable'
import { useAuth } from '../context/AuthContext'
import { buildAvatarSrc } from '../utils/avatar'
import { getChildDashboard } from '../api/dashboard'
import { getAvailableAssignments } from '../api/assignments'
import ChoreCard from '../components/ChoreCard'
import ClaimCard from '../components/ClaimCard'
import RewardsTab from '../components/RewardsTab'
import HistoryTab from '../components/HistoryTab'
import ProfileSettingsModal from '../components/ProfileSettingsModal'

const TABS = [
  { id: 'chores', label: 'My Chores' },
  { id: 'claim', label: 'Claim' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'history', label: 'History' }
]
const TAB_IDS = TABS.map(t => t.id)

export default function ChildView() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('chores')
  const [showSettings, setShowSettings] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'child'],
    queryFn: getChildDashboard
  })

  const currentIndex = TAB_IDS.indexOf(activeTab)
  const swipeHandlers = useSwipeable({
    onSwipedLeft: (e) => { if (e.event.target.closest?.('[data-no-swipe]')) return; if (currentIndex < TAB_IDS.length - 1) setActiveTab(TAB_IDS[currentIndex + 1]) },
    onSwipedRight: (e) => { if (e.event.target.closest?.('[data-no-swipe]')) return; if (currentIndex > 0) setActiveTab(TAB_IDS[currentIndex - 1]) },
    trackTouch: true
  })

  return (
    <div className="h-screen bg-app-gradient text-white flex flex-col">

      <div className="flex items-center px-6 py-3 border-b border-white/10 gap-4">
        <div className="flex items-center gap-3 min-w-0 w-48">
          <button onClick={() => setShowSettings(true)} className="shrink-0">
            <img src={buildAvatarSrc(user.avatar)} alt={user.name} className="w-12 h-12 rounded-full" />
          </button>
          <span className="text-lg font-semibold truncate">{user.nick_name || user.name}</span>
          {!isLoading && data && (
            <span className="bg-white/10 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap">
              {data.points_balance} pts
            </span>
          )}
        </div>

        <div className="flex-1 flex justify-center gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3.5 rounded-lg text-base font-medium transition-colors
                ${activeTab === tab.id ? 'bg-white/15 text-white' : 'text-white/40 active:text-white/70'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-48 flex justify-end items-center gap-3">
          <button onClick={logout} className="text-sm text-white/50 active:text-white/80">
            Log out
          </button>
        </div>
      </div>

      {showSettings && <ProfileSettingsModal onClose={() => setShowSettings(false)} />}

      <div className="relative flex-1 min-h-0">
        <div className="h-full overflow-y-auto scrollbar-hide p-4" {...swipeHandlers}>
          {activeTab === 'chores' && <ChoresTab data={data} isLoading={isLoading} />}
          {activeTab === 'claim' && <ClaimTab />}
          {activeTab === 'rewards' && <RewardsTab data={data} isLoading={isLoading}/>}
          {activeTab === 'history' && <HistoryTab />}
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent" />
      </div>

    </div>
  )
}

function ChoresTab({ data, isLoading }) {
  if (isLoading) return null
  const assignments = data?.assignments ?? []
  if (assignments.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-white/40">
        <p>No chores assigned yet.</p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-3 gap-3">
      {assignments.map(a => <ChoreCard key={a.id} assignment={a} />)}
    </div>
  )
}

function ClaimTab() {
  const { data: available, isLoading } = useQuery({
    queryKey: ['assignments', 'available'],
    queryFn: getAvailableAssignments
  })
  if (isLoading) return null
  const assignments = available ?? []
  if (assignments.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-white/40">
        <p>No chores available to claim.</p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-3 gap-3">
      {assignments.map(a => <ClaimCard key={a.id} assignment={a} />)}
    </div>
  )
}

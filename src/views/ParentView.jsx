import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSwipeable } from 'react-swipeable'
import { useAuth } from '../context/AuthContext'
import { getParentDashboard } from '../api/dashboard'
import { pauseAllActive } from '../api/assignments'
import ApprovalCard from '../components/ApprovalCard'
import ChildSummaryCard from '../components/ChildSummaryCard'
import ChoresTab from '../components/ChoresTab'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'chores', label: 'Chores' },
  { id: 'users', label: 'Users' }
]
const TAB_IDS = TABS.map(t => t.id)

export default function ParentView() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'parent'],
    queryFn: getParentDashboard
  })

  const currentIndex = TAB_IDS.indexOf(activeTab)
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => { if (currentIndex < TAB_IDS.length - 1) setActiveTab(TAB_IDS[currentIndex + 1]) },
    onSwipedRight: () => { if (currentIndex > 0) setActiveTab(TAB_IDS[currentIndex - 1]) },
    trackTouch: true
  })

  return (
    <div className="h-screen bg-slate-900 text-white flex flex-col">

      {/* Header */}
      <div className="flex items-center px-6 py-3 border-b border-white/10 gap-4">
        <div className="w-48">
          <span className="font-semibold">{user.nick_name || user.name}</span>
        </div>

        <div className="flex-1 flex justify-center gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors
                ${activeTab === tab.id ? 'bg-white/15 text-white' : 'text-white/40 active:text-white/70'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-48 flex justify-end">
          <button onClick={logout} className="text-sm text-white/50 active:text-white/80">
            Log out
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4" {...swipeHandlers}>
        {activeTab === 'dashboard' && <DashboardTab data={data} isLoading={isLoading} />}
        {activeTab === 'rewards' && <StubTab label="Rewards" />}
        {activeTab === 'chores' && <ChoresTab />}
        {activeTab === 'users' && <StubTab label="Users" />}
      </div>

    </div>
  )
}

function DashboardTab({ data, isLoading }) {
  const queryClient = useQueryClient()
  const pauseAll = useMutation({
    mutationFn: pauseAllActive,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard', 'parent'] })
  })

  if (isLoading) return null

  const submissions = data?.submittedAssignments ?? []
  const children = data?.children ?? []

  return (
    <div className="flex gap-4 h-full">

      {/* Left: approvals queue */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1">
          Pending Approval {submissions.length > 0 && `(${submissions.length})`}
        </h2>
        {submissions.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-white/30 text-sm">
            No submissions waiting
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {submissions.map(a => (
              <ApprovalCard key={a.id} assignment={a} />
            ))}
          </div>
        )}
      </div>

      {/* Right: children + pause all <w-82 may act up, revert to w-80>*/}
      <div className="w-82 flex flex-col gap-3 shrink-0">
        <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1">Children</h2>
        {children.map(child => (
          <ChildSummaryCard key={child.id} child={child} />
        ))}
        <button
          onClick={() => pauseAll.mutate()}
          disabled={pauseAll.isPending}
          className="mt-2 py-3 rounded-xl bg-orange-600/80 font-medium text-sm disabled:opacity-40 active:bg-orange-600"
        >
          Pause All Active
        </button>
      </div>

    </div>
  )
}

function StubTab({ label }) {
  return (
    <div className="flex items-center justify-center h-48 text-white/40">
      <p>{label} — coming soon</p>
    </div>
  )
}

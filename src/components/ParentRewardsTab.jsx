import { useState, useRef, useLayoutEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getProfiles } from '../api/auth'
import { getRewards, getRefundRequests } from '../api/rewards'
import RewardDetailModal from './RewardDetailModal'


// ─── Main Orchestrator ──────────────────────────────────────────────────────

export default function ParentRewardsTab() {
  const queryClient = useQueryClient()
  const [modalItem, setModalItem] = useState(null)

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ['rewards', 'all'],
    queryFn: () => getRewards({ sort: 'progress' })
  })

  const { data: refundRequests = [] } = useQuery({
    queryKey: ['rewards', 'refunds'],
    queryFn: getRefundRequests
  })

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: getProfiles
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['rewards'] })
  }

  if (isLoading) return null

  const pending  = rewards.filter(r => r.status === 'pending')
  const active   = rewards.filter(r => r.status === 'active')
  const funded   = rewards.filter(r => r.status === 'funded')
  const redeemed = rewards.filter(r => r.status === 'redeemed')
  const archived = rewards.filter(r => r.status === 'archived')

  const refundMap = {}
  for (const r of refundRequests) {
    const key = `${r.reward_id}-${r.child_id}`
    if (!refundMap[key]) refundMap[key] = { ...r, points: 0 }
    refundMap[key].points += r.points
  }
  const refunds = Object.values(refundMap)

  const openModal = (item, type) => setModalItem({ item, type })
  const allEmpty = pending.length + active.length + funded.length + refunds.length + redeemed.length + archived.length === 0

  return (
    <div className="flex flex-col gap-6">

      {pending.length > 0 && (
        <RewardSection title="Requested" count={pending.length}>
          {pending.map(r => (
            <InfoCard key={r.id} onClick={() => openModal(r, 'pending')}>
              <PendingInfo reward={r} profiles={profiles} />
            </InfoCard>
          ))}
        </RewardSection>
      )}

      {active.length > 0 && (
        <RewardSection title="Active" count={active.length}>
          {active.map(r => (
            <InfoCard key={r.id} onClick={() => openModal(r, 'active')}>
              <ActiveInfo reward={r} profiles={profiles} />
            </InfoCard>
          ))}
        </RewardSection>
      )}

      {funded.length > 0 && (
        <RewardSection title="Funded" count={funded.length}>
          {funded.map(r => (
            <InfoCard key={r.id} onClick={() => openModal(r, 'funded')}>
              <FundedInfo reward={r} />
            </InfoCard>
          ))}
        </RewardSection>
      )}

      {refunds.length > 0 && (
        <RewardSection title="Refund Requests" count={refunds.length}>
          {refunds.map(r => (
            <InfoCard key={`${r.reward_id}-${r.child_id}`} onClick={() => openModal(r, 'refunds')}>
              <RefundInfo refund={r} />
            </InfoCard>
          ))}
        </RewardSection>
      )}

      {redeemed.length > 0 && (
        <RewardSection title="Redeemed" count={redeemed.length}>
          {redeemed.map(r => (
            <InfoCard key={r.id} onClick={() => openModal(r, 'redeemed')}>
              <RedeemedInfo reward={r} />
            </InfoCard>
          ))}
        </RewardSection>
      )}

      {archived.length > 0 && (
        <RewardSection title="Archived" count={archived.length}>
          {archived.map(r => (
            <InfoCard key={r.id} onClick={() => openModal(r, 'archived')} archived>
              <ArchivedInfo reward={r} />
            </InfoCard>
          ))}
        </RewardSection>
      )}

      {allEmpty && (
        <div className="flex items-center justify-center h-48 text-white/40">
          <p>No rewards yet.</p>
        </div>
      )}

      {modalItem && (
        <RewardDetailModal
          item={modalItem.item}
          type={modalItem.type}
          profiles={profiles}
          onSuccess={invalidate}
          onClose={() => setModalItem(null)}
        />
      )}

    </div>
  )
}


// ─── Reward Section ─────────────────────────────────────────────────────────

function RewardSection({ title, count, children }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider px-1">
        {title} ({count})
      </h2>
      <HScrollRow>{children}</HScrollRow>
    </section>
  )
}


// ─── Horizontal Snap-Scroll Row ─────────────────────────────────────────────

function HScrollRow({ children }) {
  const scrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const update = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 1)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [children])

  const fadeLeft = 'transparent, rgba(0,0,0,0.15) 1.5rem, rgba(0,0,0,0.4) 3rem, rgba(0,0,0,0.7) 5rem, rgba(0,0,0,0.9) 6.5rem, black 8rem'
  const fadeRight = 'black calc(100% - 8rem), rgba(0,0,0,0.9) calc(100% - 6.5rem), rgba(0,0,0,0.7) calc(100% - 5rem), rgba(0,0,0,0.4) calc(100% - 3rem), rgba(0,0,0,0.15) calc(100% - 1.5rem), transparent'
  const maskImage = canScrollLeft && canScrollRight
    ? `linear-gradient(to right, ${fadeLeft}, ${fadeRight})`
    : canScrollLeft
    ? `linear-gradient(to right, ${fadeLeft})`
    : canScrollRight
    ? `linear-gradient(to right, ${fadeRight})`
    : undefined

  return (
    <div
      ref={scrollRef}
      data-no-swipe
      className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
      style={{ WebkitMaskImage: maskImage, maskImage }}
    >
      {children}
    </div>
  )
}


// ─── Info Card Shell ────────────────────────────────────────────────────────

function InfoCard({ children, onClick, archived }) {
  return (
    <div
      data-card
      onClick={onClick}
      className={`shrink-0 snap-center rounded-xl p-4 flex flex-col gap-2 cursor-pointer
        ${archived ? 'bg-white/5 opacity-60' : 'bg-white/15 active:bg-white/20'}`}
      style={{ width: 'calc((100% - 1.5rem) / 3.8)' }}
    >
      {children}
    </div>
  )
}


// ─── Info Card Contents ─────────────────────────────────────────────────────

function PendingInfo({ reward, profiles }) {
  const requester = profiles.find(p => p.id === reward.created_by)
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold leading-tight truncate">{reward.name}</span>
        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs shrink-0">Pending</span>
      </div>
      {reward.description && <span className="text-xs text-white/40 truncate">{reward.description}</span>}
      {requester && <span className="text-xs text-white/30">Requested by {requester.nick_name || requester.name}</span>}
    </>
  )
}

function ActiveInfo({ reward, profiles }) {
  const contributed = parseInt(reward.contributed_total) || 0
  const pct = Math.min(100, Math.round((contributed / reward.points_required) * 100))
  const remaining = reward.points_required - contributed
  const requester = profiles.find(p => p.id === reward.created_by)
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold leading-tight truncate">{reward.name}</span>
        <div className="flex gap-1 shrink-0">
          {reward.is_shared && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs">Shared</span>
          )}
          <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-xs">Active</span>
        </div>
      </div>
      {reward.description && <span className="text-xs text-white/40 truncate">{reward.description}</span>}
      {requester && <span className="text-xs text-white/30">{requester.nick_name || requester.name}</span>}
      <div className="flex flex-col gap-1">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-400 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-white/40">
          <span>{contributed} / {reward.points_required} pts</span>
          <span>{remaining} remaining</span>
        </div>
      </div>
    </>
  )
}

function FundedInfo({ reward }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold leading-tight truncate">{reward.name}</span>
        <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 text-xs shrink-0">Funded</span>
      </div>
      {reward.description && <span className="text-xs text-white/40 truncate">{reward.description}</span>}
      <span className="text-sm text-white/50">{reward.points_required} pts</span>
    </>
  )
}

function RefundInfo({ refund }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold leading-tight truncate">{refund.reward_name}</span>
        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs shrink-0">Refund</span>
      </div>
      <span className="text-xs text-white/40">{refund.child_name}</span>
      <span className="text-sm text-white/50">{refund.points} pts</span>
    </>
  )
}

function RedeemedInfo({ reward }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold leading-tight truncate">{reward.name}</span>
        <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-xs shrink-0">Redeemed</span>
      </div>
      {reward.description && <span className="text-xs text-white/40 truncate">{reward.description}</span>}
      <span className="text-sm text-white/50">{reward.points_required} pts</span>
    </>
  )
}

function ArchivedInfo({ reward }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold leading-tight truncate">{reward.name}</span>
        <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/40 text-xs shrink-0">Archived</span>
      </div>
      {reward.description && <span className="text-xs text-white/40 truncate">{reward.description}</span>}
      <span className="text-sm text-white/40">{reward.points_required} pts</span>
    </>
  )
}



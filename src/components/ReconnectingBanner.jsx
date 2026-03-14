import useOdinHealth from '../hooks/useOdinHealth'

export default function ReconnectingBanner() {
  const connected = useOdinHealth()

  if (connected) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white text-center text-sm font-medium py-1.5">
      Connection lost — reconnecting…
    </div>
  )
}

import { useOnlineStatus } from './useOnlineStatus'

export function OfflineBadge() {
  const online = useOnlineStatus()
  if (online) return null

  return (
    <div className="offline-badge" role="status" aria-live="polite">
      Sin conexión
    </div>
  )
}

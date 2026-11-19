import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

const getOnline = () => navigator.onLine

/** true si el navegador reporta conexión; se actualiza con los eventos online/offline. */
export function useOnlineStatus() {
  return useSyncExternalStore(subscribe, getOnline, () => true)
}

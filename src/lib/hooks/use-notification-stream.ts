'use client'
import { useEffect } from 'react'

export function useNotificationStream(onNotification: (data: unknown) => void) {
  useEffect(() => {
    const es = new EventSource('/api/notifications/stream')
    es.onmessage = (e) => {
      try {
        onNotification(JSON.parse(e.data as string))
      } catch {
        // Malformed event, ignore
      }
    }
    return () => es.close()
  }, [onNotification])
}

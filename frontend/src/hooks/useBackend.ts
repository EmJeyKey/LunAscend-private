import { useCallback, useEffect, useState } from 'react'
import { checkBackend } from '../api/client'
import type { BackendConnection } from '../types/api'

export function useBackend() {
  const [connection, setConnection] = useState<BackendConnection>({ status: 'checking' })
  const [attempt, setAttempt] = useState(0)
  const refresh = useCallback(() => setAttempt(previous => previous + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setConnection({ status: 'checking' })
    checkBackend(controller.signal).then(result => {
      if (!controller.signal.aborted) setConnection({ status: 'connected', ...result })
    }).catch(() => {
      if (!controller.signal.aborted) setConnection({ status: 'disconnected', message: 'Backend offline or incompatible. The interface preview is still available.' })
    })
    return () => controller.abort()
  }, [attempt])

  return { connection, refresh }
}

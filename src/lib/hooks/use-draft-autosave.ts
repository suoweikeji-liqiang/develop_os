'use client'

import { useEffect, useState, useRef } from 'react'

const STORAGE_PREFIX = 'devos-draft-'

interface DraftData {
  rawInput: string
  lastSaved: number
}

function readDraft(draftId: string): DraftData | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${draftId}`)
    return stored ? (JSON.parse(stored) as DraftData) : null
  } catch {
    return null
  }
}

export function useDraftAutosave(draftId: string, value: string, intervalMs = 30000) {
  const [savedValue] = useState<string | null>(() => readDraft(draftId)?.rawInput ?? null)
  const [lastSaved, setLastSaved] = useState<number | null>(() => readDraft(draftId)?.lastSaved ?? null)
  const valueRef = useRef(value)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  // Auto-save on interval
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now()
      const data: DraftData = { rawInput: valueRef.current, lastSaved: now }
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${draftId}`, JSON.stringify(data))
        setLastSaved(now)
      } catch {
        // Ignore storage errors
      }
    }, intervalMs)

    return () => clearInterval(timer)
  }, [draftId, intervalMs])

  return { savedValue, lastSaved }
}

export function clearDraft(draftId: string) {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${draftId}`)
  } catch {
    // Ignore
  }
}

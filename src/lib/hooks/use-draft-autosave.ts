'use client'

import { useEffect, useState, useRef } from 'react'

const STORAGE_PREFIX = 'devos-draft-'

interface DraftData {
  rawInput: string
  lastSaved: number
}

export function useDraftAutosave(draftId: string, value: string, intervalMs = 30000) {
  const [savedValue, setSavedValue] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<number | null>(null)
  const valueRef = useRef(value)
  valueRef.current = value

  // Load saved draft on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${draftId}`)
      if (stored) {
        const parsed: DraftData = JSON.parse(stored)
        setSavedValue(parsed.rawInput)
        setLastSaved(parsed.lastSaved)
      }
    } catch {
      // Ignore parse errors
    }
  }, [draftId])

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

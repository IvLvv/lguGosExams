"use client"

import { useState, useEffect, useCallback } from "react"

export interface TicketProgress {
  passed: boolean
  stars: number // 0-3 based on performance
}

type ProgressMap = Record<number, TicketProgress>

const STORAGE_KEY = "ticket_progress"

export function useProgress() {
  const [progress, setProgress] = useState<ProgressMap>({})

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setProgress(JSON.parse(stored))
    } catch {}
  }, [])

  const save = useCallback((map: ProgressMap) => {
    setProgress(map)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
    } catch {}
  }, [])

  const markPassed = useCallback((ticketId: number, stars: number) => {
    setProgress((prev) => {
      const next = { ...prev, [ticketId]: { passed: true, stars } }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  const passedCount = Object.values(progress).filter((p) => p.passed).length

  return { progress, markPassed, save, passedCount }
}

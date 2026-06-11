"use client"

import { useState, useEffect, useCallback } from "react"

export interface TicketProgress {
  passed: boolean
  stars: number
}

type ProgressMap = Record<string, TicketProgress>

const STORAGE_KEY = "ticket_progress_v2"

export function useProgress() {
  const [progress, setProgress] = useState<ProgressMap>({})

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setProgress(JSON.parse(stored))
    } catch {}
  }, [])

  const markPassed = useCallback((discipline: string, ticketId: number, stars: number) => {
    const key = `${discipline}-${ticketId}`
    setProgress((prev) => {
      const next = { ...prev, [key]: { passed: true, stars } }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  const getTicketProgress = useCallback(
    (discipline: string, ticketId: number): TicketProgress | undefined => {
      return progress[`${discipline}-${ticketId}`]
    },
    [progress]
  )

  const passedCountForDiscipline = useCallback(
    (discipline: string) =>
      Object.entries(progress).filter(
        ([key, p]) => p.passed && key.startsWith(`${discipline}-`)
      ).length,
    [progress]
  )

  return { progress, markPassed, getTicketProgress, passedCountForDiscipline }
}

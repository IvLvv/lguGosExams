"use client"

import { useState } from "react"
import Link from "next/link"
import { DISCIPLINES, DISCIPLINE_ORDER, type DisciplineKey } from "@/data/tickets"
import TicketCard from "@/components/TicketCard"
import { useProgress } from "@/hooks/useProgress"

const STUB_TITLE = "Билет в разработке"

export default function HomePage() {
  const { getTicketProgress, passedCountForDiscipline } = useProgress()
  const [discipline, setDiscipline] = useState<DisciplineKey>("advertising")

  const disc = DISCIPLINES[discipline]
  const passedCount = passedCountForDiscipline(discipline)

  const allTickets = Array.from({ length: disc.total }, (_, i) => {
    const id = i + 1
    return disc.tickets.find((t) => t.id === id) ?? {
      id,
      title: STUB_TITLE,
      difficulty: 1 as const,
      questions: [],
      openQuestions: [],
    }
  })

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-indigo-500 text-xs font-semibold tracking-widest uppercase mb-3">
            Подготовка к государственному экзамену
          </p>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-6 tracking-tight">
            Экзаменационные билеты
          </h1>

          {/* Discipline selector */}
          <div className="inline-flex rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-6">
            {DISCIPLINE_ORDER.map((key) => (
              <button
                key={key}
                onClick={() => setDiscipline(key)}
                className={`px-7 py-2.5 text-sm font-semibold transition-colors ${
                  discipline === key
                    ? "bg-indigo-600 text-white"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {DISCIPLINES[key].label}
              </button>
            ))}
          </div>

          <p className="text-gray-500 text-base">
            Выберите билет и пройдите проверку с&nbsp;AI&#8209;ассистентом
          </p>

          {/* Progress badge */}
          <div className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-full border border-gray-200 bg-white shadow-sm">
            <span className="text-lg font-bold text-gray-900">{passedCount}</span>
            <span className="text-sm text-gray-500">из {disc.total} билетов пройдено</span>
            {passedCount > 0 && (
              <span className="ml-1 text-emerald-500 text-sm font-medium">
                ({Math.round((passedCount / disc.total) * 100)}%)
              </span>
            )}
          </div>

          {/* Final exam link */}
          <div className="mt-4">
            <Link
              href={`/exam/${discipline}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 transition-colors"
            >
              📝 Итоговый тест
            </Link>
          </div>
        </div>

        {/* Progress bar */}
        {passedCount > 0 && (
          <div className="mb-8 bg-white rounded-full h-2 border border-gray-100 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${(passedCount / disc.total) * 100}%` }}
            />
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allTickets.map((ticket, i) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              discipline={discipline}
              displayId={i + 1}
              progress={getTicketProgress(discipline, ticket.id)}
            />
          ))}
        </div>
      </div>
    </main>
  )
}

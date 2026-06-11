"use client"

import { tickets, totalTickets } from "@/data/tickets"
import TicketCard from "@/components/TicketCard"
import { useProgress } from "@/hooks/useProgress"

export default function HomePage() {
  const { progress, passedCount } = useProgress()

  const allTickets = Array.from({ length: totalTickets }, (_, i) => {
    const id = i + 1
    return tickets.find((t) => t.id === id) ?? {
      id,
      title: "Билет в разработке",
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
            Подготовка к экзамену
          </p>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
            Билеты по журналистике
          </h1>
          <p className="text-gray-500 text-base">
            Выберите билет, изучите материал и пройдите проверку с&nbsp;AI&#8209;ассистентом
          </p>

          {/* Progress badge */}
          <div className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-full border border-gray-200 bg-white shadow-sm">
            <span className="text-lg font-bold text-gray-900">{passedCount}</span>
            <span className="text-sm text-gray-500">из {totalTickets} билетов пройдено</span>
            {passedCount > 0 && (
              <span className="ml-1 text-emerald-500 text-sm font-medium">
                ({Math.round((passedCount / totalTickets) * 100)}%)
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {passedCount > 0 && (
          <div className="mb-8 bg-white rounded-full h-2 border border-gray-100 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${(passedCount / totalTickets) * 100}%` }}
            />
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              progress={progress[ticket.id]}
            />
          ))}
        </div>
      </div>
    </main>
  )
}

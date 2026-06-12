"use client"

import Link from "next/link"
import { Ticket } from "@/data/tickets"
import { TicketProgress } from "@/hooks/useProgress"

interface Props {
  ticket: Ticket
  discipline: string
  displayId: number
  progress?: TicketProgress
}


export default function TicketCard({ ticket, discipline, displayId, progress }: Props) {
  const passed = progress?.passed
  const hasQuestions = ticket.questions.length > 0

  return (
    <div className="relative group/card">
      {hasQuestions && (
        <Link
          href={`/bank/${discipline}/${ticket.id}`}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 z-10 opacity-0 group-hover/card:opacity-100 transition-opacity
            px-2 py-0.5 rounded-md text-xs font-medium bg-white border border-gray-200
            text-gray-400 hover:text-indigo-600 hover:border-indigo-300 shadow-sm"
        >
          банк
        </Link>
      )}
    <Link href={`/ticket/${discipline}/${ticket.id}`}>
      <div
        className={`
          group relative bg-white rounded-2xl p-5 flex gap-4 items-start
          shadow-sm border transition-all duration-200
          hover:shadow-md hover:-translate-y-0.5 cursor-pointer
          ${passed ? "border-emerald-200 bg-emerald-50/30" : "border-gray-100"}
        `}
      >
        {/* Number badge */}
        <div
          className={`
            flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
            text-sm font-semibold
            ${passed ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"}
          `}
        >
          {displayId}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-400 tracking-wider uppercase">
              Билет {displayId}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-800 leading-snug line-clamp-3">
            {ticket.title}
          </p>
        </div>

        {/* Passed checkmark */}
        {passed && (
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    </Link>
    </div>
  )
}

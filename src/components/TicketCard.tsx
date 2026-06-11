"use client"

import Link from "next/link"
import { Ticket } from "@/data/tickets"
import { TicketProgress } from "@/hooks/useProgress"

interface Props {
  ticket: Ticket
  progress?: TicketProgress
}

function Stars({ difficulty, filled }: { difficulty: number; filled?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map((i) => {
        const active = i <= difficulty
        const color = filled
          ? active ? "text-emerald-400" : "text-gray-300"
          : active ? "text-red-400" : "text-gray-300"
        return (
          <svg key={i} className={`w-3.5 h-3.5 ${color}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )
      })}
    </div>
  )
}

export default function TicketCard({ ticket, progress }: Props) {
  const passed = progress?.passed

  return (
    <Link href={`/ticket/${ticket.id}`}>
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
          {ticket.id}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-400 tracking-wider uppercase">
              Билет {ticket.id}
            </span>
            <Stars difficulty={ticket.difficulty} filled={passed} />
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
  )
}

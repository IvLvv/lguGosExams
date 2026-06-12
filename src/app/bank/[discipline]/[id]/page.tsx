"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { DISCIPLINES } from "@/data/tickets"

export default function BankPage() {
  const params = useParams()
  const disciplineKey = String(params.discipline)
  const id = Number(params.id)
  const [showAnswers, setShowAnswers] = useState(false)

  const disc = DISCIPLINES[disciplineKey]
  const ticket = disc?.tickets.find((t) => t.id === id)

  if (!disc || !ticket) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-500">
        <p>Билет не найден</p>
        <Link href="/" className="text-indigo-600 hover:underline text-sm">← К списку</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 mb-8 group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Все билеты
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
            {id}
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-400 font-medium tracking-wider uppercase mb-1">
              {disc.label} · Банк вопросов
            </p>
            <p className="text-gray-900 font-semibold leading-snug">{ticket.title}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-3 text-sm text-gray-500">
            <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-medium">
              {ticket.questions.length} MCQ
            </span>
            <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full font-medium">
              {ticket.openQuestions.length} открытых
            </span>
          </div>
          <button
            onClick={() => setShowAnswers((v) => !v)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors border ${
              showAnswers
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
            }`}
          >
            {showAnswers ? "Скрыть ответы" : "Показать ответы"}
          </button>
        </div>

        {/* MCQ */}
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Вопросы с выбором ответа
        </h2>
        <div className="space-y-4 mb-10">
          {ticket.questions.map((q, qi) => (
            <div key={qi} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-sm font-medium text-gray-900 mb-3">
                <span className="text-gray-400 mr-2">{qi + 1}.</span>
                {q.question}
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {q.options.map((opt, oi) => {
                  const isCorrect = oi === q.correct
                  return (
                    <div
                      key={oi}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                        showAnswers && isCorrect
                          ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                          : "bg-gray-50 text-gray-700"
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        showAnswers && isCorrect ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500"
                      }`}>
                        {String.fromCharCode(65 + oi)}
                      </span>
                      {opt}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Open questions */}
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Открытые вопросы
        </h2>
        <div className="space-y-3">
          {ticket.openQuestions.map((q, qi) => (
            <div key={qi} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-sm text-gray-900">
                <span className="text-purple-400 font-bold mr-2">{qi + 1}.</span>
                {q}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { DISCIPLINES } from "@/data/tickets"
import ExamSession, { type ExamQuestion } from "@/components/exam/ExamSession"

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type Mode = "exam" | "learn"

export default function ExamPage() {
  const params = useParams()
  const disciplineKey = String(params.discipline)
  const disc = DISCIPLINES[disciplineKey]

  const [phase, setPhase] = useState<"start" | "exam">("start")
  const [mode, setMode] = useState<Mode>("exam")
  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [perfect, setPerfect] = useState(false)

  const storageKey = `${disciplineKey}-exam-perfect`

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPerfect(localStorage.getItem(storageKey) === "1")
    }
  }, [storageKey])

  if (!disc) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-500">
        <p className="text-lg">Дисциплина не найдена</p>
        <Link href="/" className="text-indigo-600 hover:underline text-sm">
          ← К списку билетов
        </Link>
      </div>
    )
  }

  const ticketsWithQuestions = disc.tickets.filter((t) => t.questions.length > 0)
  const expectedTotal = ticketsWithQuestions.length * 10

  const buildExam = (): ExamQuestion[] => {
    const all: ExamQuestion[] = []
    for (const ticket of disc.tickets) {
      if (ticket.questions.length === 0) continue
      const picked = shuffle(ticket.questions).slice(0, 10)
      for (const q of picked) {
        all.push({ ...q, ticketId: ticket.id })
      }
    }
    return shuffle(all)
  }

  const startExam = () => {
    setQuestions(buildExam())
    setPhase("exam")
  }

  const handlePerfect = () => {
    localStorage.setItem(storageKey, "1")
    setPerfect(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors mb-8 group"
        >
          <svg
            className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Все билеты
        </Link>

        {phase === "start" && (
          <div className="text-center">
            <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-100">
              <div className="text-5xl mb-4">📝</div>
              <p className="text-indigo-500 text-xs font-semibold tracking-widest uppercase mb-2">
                {disc.label}
              </p>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Итоговый тест</h1>

              {perfect && (
                <div className="inline-flex items-center gap-1.5 mt-2 mb-3 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                  🏆 Пройден без ошибок
                </div>
              )}

              {/* Mode selector */}
              <div className="flex rounded-xl border border-gray-200 overflow-hidden mt-5 mb-5">
                <button
                  onClick={() => setMode("exam")}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    mode === "exam" ? "bg-indigo-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  Экзамен
                </button>
                <button
                  onClick={() => setMode("learn")}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    mode === "learn" ? "bg-indigo-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  Обучение
                </button>
              </div>

              <p className="text-gray-500 text-sm leading-relaxed mb-7 max-w-sm mx-auto">
                {mode === "exam"
                  ? "Одна ошибка — тест начинается заново. Ответь на все вопросы без единой ошибки."
                  : "Ошибки не останавливают тест. Пройдёшь все вопросы без ошибок — отмечается изученным."}
              </p>

              <div className="flex justify-center gap-10 mb-8">
                <div className="text-center">
                  <div className="text-3xl font-extrabold text-indigo-600">
                    {ticketsWithQuestions.length}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">билетов</div>
                </div>
                <div className="w-px bg-gray-100 self-stretch" />
                <div className="text-center">
                  <div className="text-3xl font-extrabold text-indigo-600">{expectedTotal}</div>
                  <div className="text-xs text-gray-400 mt-1">вопросов</div>
                </div>
                <div className="w-px bg-gray-100 self-stretch" />
                <div className="text-center">
                  <div className="text-3xl font-extrabold text-indigo-600">∞</div>
                  <div className="text-xs text-gray-400 mt-1">попыток</div>
                </div>
              </div>

              {expectedTotal === 0 ? (
                <p className="text-gray-400 text-sm">Для этой дисциплины ещё нет вопросов.</p>
              ) : (
                <button
                  onClick={startExam}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-base"
                >
                  Начать тест
                </button>
              )}
            </div>
          </div>
        )}

        {phase === "exam" && (
          <ExamSession
            questions={questions}
            mode={mode}
            onRestart={startExam}
            onPerfect={mode === "learn" ? handlePerfect : undefined}
          />
        )}
      </div>
    </div>
  )
}

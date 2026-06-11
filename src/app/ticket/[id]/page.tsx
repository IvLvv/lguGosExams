"use client"

import { useState, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { tickets, QUESTIONS_PER_SESSION } from "@/data/tickets"
import { useProgress } from "@/hooks/useProgress"
import QuizSession from "@/components/quiz/QuizSession"
import OpenQuestion from "@/components/quiz/OpenQuestion"

type Phase = "landing" | "quiz" | "open" | "done"

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function DifficultyStars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map((i) => (
        <svg key={i} className={`w-4 h-4 ${i <= n ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

export default function TicketPage() {
  const params = useParams()
  const id = Number(params.id)
  const { progress, markPassed } = useProgress()
  const ticket = tickets.find((t) => t.id === id)
  const ticketProgress = progress[id]

  const [phase, setPhase] = useState<Phase>("landing")
  const [sessionQuestions, setSessionQuestions] = useState<typeof ticket extends undefined ? never[] : (NonNullable<typeof ticket>["questions"])>([])
  const [openQuestion, setOpenQuestion] = useState("")
  const [attempts, setAttempts] = useState(0)

  const startSession = () => {
    if (!ticket) return
    const picked = shuffle(ticket.questions).slice(0, QUESTIONS_PER_SESSION)
    const open = shuffle(ticket.openQuestions)[0]
    setSessionQuestions(picked as any)
    setOpenQuestion(open)
    setAttempts((a) => a + 1)
    setPhase("quiz")
  }

  const handleMCQComplete = () => setPhase("open")
  const handleExit = () => setPhase("landing")

  const handlePassed = () => {
    markPassed(id, 3)
    setPhase("done")
  }

  const handleFailed = () => {
    setPhase("landing")
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-500">
        <p className="text-lg">Билет №{id} ещё не добавлен</p>
        <Link href="/" className="text-indigo-600 hover:underline text-sm">← Назад к списку</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors mb-8 group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Все билеты
        </Link>

        {/* Ticket header (always visible) */}
        {phase !== "done" && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-8 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
              {ticket.id}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400 font-medium tracking-wider uppercase">Билет {ticket.id}</span>
                <DifficultyStars n={ticket.difficulty} />
              </div>
              <p className="text-gray-900 font-semibold leading-snug">{ticket.title}</p>
              {ticketProgress?.passed && (
                <span className="inline-flex items-center gap-1 mt-2 text-xs text-emerald-600 font-medium bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Уже пройден
                </span>
              )}
            </div>
          </div>
        )}

        {/* Landing */}
        {phase === "landing" && (
          <div className="text-center">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-5">
              <div className="text-5xl mb-4">📋</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Тест по билету</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                10 случайных вопросов из 30. Нужно ответить на все без ошибок,
                затем ответить на открытый вопрос — его оценит AI.
              </p>
              <div className="flex justify-center gap-6 mb-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">10</span>
                  вопросов с выбором
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">1</span>
                  открытый вопрос
                </div>
              </div>
              <button
                onClick={startSession}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                {attempts > 0 ? "Попробовать снова" : "Начать тест"}
              </button>
            </div>
            {attempts > 0 && (
              <p className="text-xs text-gray-400">Попытка {attempts + 1} · Вопросы каждый раз разные</p>
            )}
          </div>
        )}

        {/* MCQ Quiz */}
        {phase === "quiz" && (
          <QuizSession
            questions={sessionQuestions as any}
            onComplete={handleMCQComplete}
            onExit={handleExit}
          />
        )}

        {/* Transition to open question */}
        {phase === "quiz" ? null : null}

        {/* Open question */}
        {phase === "open" && (
          <div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-sm font-semibold text-emerald-800">10 из 10 — отлично!</p>
                <p className="text-xs text-emerald-600">Осталось ответить на открытый вопрос</p>
              </div>
            </div>
            <OpenQuestion
              ticket={ticket}
              question={openQuestion}
              onPassed={handlePassed}
              onFailed={handleFailed}
            />
          </div>
        )}

        {/* Done */}
        {phase === "done" && (
          <div className="text-center bg-white rounded-2xl p-10 shadow-sm border border-gray-100">
            <div className="text-6xl mb-4">🎓</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Билет пройден!</h2>
            <p className="text-gray-500 text-sm mb-8">
              Отличная работа! Вы успешно сдали билет №{ticket.id}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                К списку билетов
              </Link>
              {id < 60 && tickets.find((t) => t.id === id + 1) && (
                <Link
                  href={`/ticket/${id + 1}`}
                  className="px-6 py-3 border-2 border-indigo-200 text-indigo-600 hover:border-indigo-400 font-semibold rounded-xl transition-colors text-sm"
                >
                  Следующий билет →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

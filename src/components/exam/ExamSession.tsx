"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { MCQQuestion } from "@/data/tickets"

export interface ExamQuestion extends MCQQuestion {
  ticketId: number
}

interface Props {
  questions: ExamQuestion[]
  mode: "exam" | "learn"
  onRestart: () => void
  onPerfect?: () => void
}

type AnswerState = "idle" | "correct" | "wrong"

export default function ExamSession({ questions, mode, onRestart, onPerfect }: Props) {
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [errors, setErrors] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answerState, setAnswerState] = useState<AnswerState>("idle")
  const [done, setDone] = useState(false)

  const q = questions[current]
  const total = questions.length

  useEffect(() => {
    if (done && mode === "learn" && errors === 0) {
      onPerfect?.()
    }
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps

  const advance = useCallback(() => {
    if (current + 1 >= total) {
      setDone(true)
    } else {
      setCurrent((c) => c + 1)
      setSelected(null)
      setAnswerState("idle")
    }
  }, [current, total])

  const handleSelect = useCallback(
    (idx: number) => {
      if (answerState !== "idle") return
      setSelected(idx)
      if (idx === q.correct) {
        setScore((s) => s + 1)
        setAnswerState("correct")
        setTimeout(advance, 700)
      } else {
        setErrors((e) => e + 1)
        setAnswerState("wrong")
      }
    },
    [answerState, q, advance]
  )

  if (done) {
    const pct = Math.round((score / total) * 100)
    const perfect = errors === 0
    const grade = pct >= 90 ? "Отлично" : pct >= 75 ? "Хорошо" : pct >= 60 ? "Удовлетворительно" : "Неудовлетворительно"
    const gradeColor = pct >= 90 ? "text-emerald-600" : pct >= 75 ? "text-indigo-600" : pct >= 60 ? "text-amber-500" : "text-red-600"
    const barColor = pct >= 90 ? "bg-emerald-500" : pct >= 75 ? "bg-indigo-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500"

    return (
      <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-100 text-center">
        <div className="text-6xl mb-4">{perfect ? "🏆" : "🎓"}</div>
        {perfect ? (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Изучено!</h2>
            <p className="text-emerald-600 font-semibold mb-6">
              {total} из {total} без единой ошибки
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Тест завершён</h2>
            <div className={`text-5xl font-extrabold mb-1 ${gradeColor}`}>{pct}%</div>
            <div className={`text-base font-semibold mb-1 ${gradeColor}`}>{grade}</div>
            <p className="text-gray-400 text-sm mb-2">
              Правильных: {score} из {total} · Ошибок: {errors}
            </p>
          </>
        )}

        {!perfect && (
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-6">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
          <button
            onClick={onRestart}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            Пройти снова
          </button>
          <Link
            href="/"
            className="px-6 py-3 border-2 border-gray-200 text-gray-600 hover:border-indigo-300 font-semibold rounded-xl transition-colors text-sm"
          >
            К билетам
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">
            Вопрос {current + 1} из {total}
          </span>
          <span className="text-sm font-medium text-emerald-600">{score} правильных</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${((current + 1) / total) * 100}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1.5">Билет {q.ticketId}</p>
      </div>

      {/* Question */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-5">
        <p className="text-gray-900 font-semibold text-base leading-relaxed">{q.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {q.options.map((option, idx) => {
          let style = "border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50"
          if (selected === idx) {
            if (answerState === "correct") style = "border-emerald-400 bg-emerald-50 text-emerald-800"
            else if (answerState === "wrong") style = "border-red-400 bg-red-50 text-red-800"
          } else if (answerState === "wrong" && idx === q.correct) {
            style = "border-emerald-400 bg-emerald-50 text-emerald-800"
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={answerState !== "idle"}
              className={`w-full text-left px-5 py-3.5 rounded-xl border-2 text-sm font-medium transition-all duration-150 flex items-center gap-3 ${style} disabled:cursor-default`}
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">
                {String.fromCharCode(65 + idx)}
              </span>
              {option}
            </button>
          )
        })}
      </div>

      {/* Exam mode: wrong → restart */}
      {answerState === "wrong" && mode === "exam" && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
          <p className="text-red-700 font-semibold mb-1">Неверно!</p>
          <p className="text-red-600 text-sm mb-4">
            Правильный ответ выделен. В режиме экзамена нужно пройти все вопросы без единой ошибки.
          </p>
          <button
            onClick={onRestart}
            className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Начать заново
          </button>
        </div>
      )}

      {/* Learn mode: wrong → continue */}
      {answerState === "wrong" && mode === "learn" && (
        <div className="mt-5 bg-red-50 border border-red-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-4">
            <p className="text-red-700 text-sm font-medium">Неверно — правильный ответ выделен</p>
            <button
              onClick={advance}
              className="ml-4 flex-shrink-0 px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Далее →
            </button>
          </div>
          {q.explanation && (
            <div className="px-4 pb-4 border-t border-red-100">
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mt-3 mb-1">Пояснение</p>
              <p className="text-red-800 text-sm leading-relaxed">{q.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

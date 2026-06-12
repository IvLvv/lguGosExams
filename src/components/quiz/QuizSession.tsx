"use client"

import { useState, useCallback } from "react"
import { MCQQuestion } from "@/data/tickets"

interface Props {
  questions: MCQQuestion[]
  onComplete: () => void
  onExit: () => void
}

type AnswerState = "idle" | "correct" | "wrong"
type Phase = "quiz" | "retry"

export default function QuizSession({ questions, onComplete, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>("quiz")
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [errors, setErrors] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answerState, setAnswerState] = useState<AnswerState>("idle")
  const [results, setResults] = useState<("correct" | "wrong" | null)[]>(() => Array(questions.length).fill(null))

  const q = questions[current]

  const advance = useCallback(() => {
    if (current + 1 >= questions.length) {
      if (errors === 0) {
        onComplete()
      } else {
        setPhase("retry")
      }
    } else {
      setCurrent((c) => c + 1)
      setSelected(null)
      setAnswerState("idle")
    }
  }, [current, errors, questions.length, onComplete])

  const handleSelect = useCallback(
    (idx: number) => {
      if (answerState !== "idle") return
      setSelected(idx)
      if (idx === q.correct) {
        setScore((s) => s + 1)
        setResults((r) => { const n = [...r]; n[current] = "correct"; return n })
        setAnswerState("correct")
        setTimeout(advance, 700)
      } else {
        setErrors((e) => e + 1)
        setResults((r) => { const n = [...r]; n[current] = "wrong"; return n })
        setAnswerState("wrong")
      }
    },
    [answerState, q, advance]
  )

  const handleRetry = () => {
    setPhase("quiz")
    setCurrent(0)
    setScore(0)
    setErrors(0)
    setSelected(null)
    setAnswerState("idle")
    setResults(Array(questions.length).fill(null))
  }

  if (phase === "retry") {
    const correct = questions.length - errors
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {correct} из {questions.length} правильных
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Для перехода к открытому вопросу нужно ответить на все без ошибок.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              Повторить тест
            </button>
            <button
              onClick={onExit}
              className="px-6 py-3 border-2 border-gray-200 text-gray-600 hover:border-gray-300 font-semibold rounded-xl transition-colors text-sm"
            >
              Вернуться к билету
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">
            Вопрос {current + 1} из {questions.length}
          </span>
          <span className="text-sm text-gray-400">{score} правильных</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${(current / questions.length) * 100}%` }}
          />
        </div>

        <div className="flex gap-1.5 mt-3 justify-center">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                results[i] === "correct" ? "bg-emerald-400" :
                results[i] === "wrong" ? "bg-red-400" :
                i === current ? "bg-indigo-500" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-5">
        <p className="text-gray-900 font-semibold text-base leading-relaxed">{q.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {q.options.map((option, idx) => {
          let style =
            "border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50"

          if (selected === idx) {
            if (answerState === "correct") style = "border-emerald-400 bg-emerald-50 text-emerald-800"
            else if (answerState === "wrong") style = "border-red-400 bg-red-50 text-red-800"
            else style = "border-indigo-400 bg-indigo-50 text-indigo-800"
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

      {/* Wrong answer */}
      {answerState === "wrong" && (
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

      {answerState !== "wrong" && (
        <div className="mt-6 text-center">
          <button onClick={onExit} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Выйти из теста
          </button>
        </div>
      )}
    </div>
  )
}

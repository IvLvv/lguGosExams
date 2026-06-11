"use client"

import { useState, useCallback } from "react"
import { MCQQuestion } from "@/data/tickets"

interface Props {
  questions: MCQQuestion[]   // 10 randomly picked
  onComplete: () => void     // called when all 10 correct
  onExit: () => void
}

type AnswerState = "idle" | "correct" | "wrong"

export default function QuizSession({ questions, onComplete, onExit }: Props) {
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answerState, setAnswerState] = useState<AnswerState>("idle")

  const q = questions[current]
  const progress = current + 1

  const handleSelect = useCallback((idx: number) => {
    if (answerState !== "idle") return
    setSelected(idx)
    if (idx === q.correct) {
      setAnswerState("correct")
      setTimeout(() => {
        if (current + 1 >= questions.length) {
          onComplete()
        } else {
          setCurrent((c) => c + 1)
          setSelected(null)
          setAnswerState("idle")
        }
      }, 700)
    } else {
      setAnswerState("wrong")
    }
  }, [answerState, current, q, questions.length, onComplete])

  const handleRestart = () => {
    onExit()
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">
            Вопрос {progress} из {questions.length}
          </span>
          <span className="text-sm text-gray-400">
            {current} правильных
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${(current / questions.length) * 100}%` }}
          />
        </div>

        {/* Step dots */}
        <div className="flex gap-1.5 mt-3 justify-center">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < current
                  ? "bg-emerald-400"
                  : i === current
                  ? "bg-indigo-500"
                  : "bg-gray-200"
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
          let style = "border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50"

          if (selected === idx) {
            if (answerState === "correct") {
              style = "border-emerald-400 bg-emerald-50 text-emerald-800"
            } else if (answerState === "wrong") {
              style = "border-red-400 bg-red-50 text-red-800"
            } else {
              style = "border-indigo-400 bg-indigo-50 text-indigo-800"
            }
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

      {/* Wrong answer restart prompt */}
      {answerState === "wrong" && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
          <p className="text-red-700 font-semibold mb-1">Неверно!</p>
          <p className="text-red-600 text-sm mb-4">
            Правильный ответ выделен зелёным. Нужно ответить на все 10 вопросов без ошибок.
          </p>
          <button
            onClick={handleRestart}
            className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Начать заново
          </button>
        </div>
      )}

      {/* Exit */}
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

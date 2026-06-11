"use client"

import { useState, useRef, useEffect } from "react"
import { Ticket } from "@/data/tickets"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface Props {
  ticket: Ticket
  question: string
  displayId?: number
  onPassed: () => void
  onFailed: () => void
}

const PASSED_SIGNAL = "[[PASSED]]"
const FAILED_SIGNAL = "[[FAILED]]"

export default function OpenQuestion({ ticket, question, displayId, onPassed, onFailed }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [verdict, setVerdict] = useState<"passed" | "failed" | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: "user", content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          ticketId: ticket.id,
          ticketTitle: ticket.title,
          ticketContent: null,
          openQuestion: question,
          mode: "evaluate",
        }),
      })

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => `HTTP ${res.status}`)
        throw new Error(errText)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let text = ""

      setMessages((prev) => [...prev, { role: "assistant", content: "" }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split("\n").filter((l) => l.startsWith("data: "))) {
          const data = line.slice(6).trim()
          if (data === "[DONE]") continue
          try {
            const delta = JSON.parse(data).choices?.[0]?.delta?.content ?? ""
            text += delta
            setMessages((prev) => {
              const updated = [...prev]
              updated[updated.length - 1] = { role: "assistant", content: text }
              return updated
            })
          } catch {}
        }
      }

      if (text.includes(PASSED_SIGNAL)) {
        setVerdict("passed")
        setTimeout(onPassed, 1800)
      } else if (text.includes(FAILED_SIGNAL)) {
        setVerdict("failed")
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ошибка соединения."
      setMessages((prev) => [...prev, { role: "assistant", content: `Ошибка: ${msg.slice(0, 200)}` }])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    send(input)
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-indigo-600 text-white rounded-2xl p-5 mb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200 mb-1">
          Открытый вопрос · Билет {displayId ?? ticket.id}
        </p>
        <p className="font-semibold text-lg leading-snug">{question}</p>
      </div>

      <p className="text-sm text-gray-500 text-center mb-5">
        Напишите развёрнутый ответ. AI-ассистент оценит понимание и может задать уточняющие вопросы.
      </p>

      {/* Chat */}
      {messages.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 p-4 space-y-3 max-h-80 overflow-y-auto">
          {messages.map((m, i) => {
            const displayText = m.content
              .replace(PASSED_SIGNAL, "")
              .replace(FAILED_SIGNAL, "")
              .trim()
            return (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}
                >
                  {displayText || (loading && i === messages.length - 1 ? (
                    <span className="flex gap-1 py-0.5">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </span>
                  ) : "")}
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Verdict banners */}
      {verdict === "passed" && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 text-center mb-4 animate-in fade-in">
          <div className="text-3xl mb-2">🎉</div>
          <p className="font-bold text-emerald-800 text-lg">Билет пройден!</p>
          <p className="text-emerald-600 text-sm mt-1">Отличное понимание материала</p>
        </div>
      )}
      {verdict === "failed" && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 text-center mb-4">
          <p className="font-semibold text-orange-800 mb-1">Нужно доработать ответ</p>
          <p className="text-orange-600 text-sm mb-3">Продолжи диалог с ассистентом или попробуй снова</p>
          <button
            onClick={onFailed}
            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Начать заново
          </button>
        </div>
      )}

      {/* Input */}
      {verdict !== "passed" && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            placeholder={messages.length === 0 ? "Напишите ваш ответ..." : "Продолжить..."}
            disabled={loading}
            rows={3}
            className="flex-1 text-sm px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="self-end w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4 rotate-90" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
      )}
    </div>
  )
}

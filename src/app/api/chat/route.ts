import { NextRequest } from "next/server"

export async function POST(req: NextRequest) {
  const { messages, ticketId, ticketTitle, ticketContent, openQuestion, mode } = await req.json()

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY not set" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  let systemPrompt: string

  if (mode === "evaluate") {
    systemPrompt = `Ты — строгий, но справедливый экзаменатор по журналистике.
Студент отвечает на открытый вопрос по билету №${ticketId} "${ticketTitle}".

Открытый вопрос: "${openQuestion}"

Твоя задача:
1. Оцени ответ студента по существу: понимает ли он тему?
2. Можешь задать не более 2 уточняющих вопросов, если ответ неполный, но обнадёживающий.
3. После того как получишь достаточно информации, выяви вердикт.

ВАЖНО — формат вердикта (добавь в конец своего финального сообщения):
- Если студент показал хорошее понимание → добавь [[PASSED]] в конце
- Если студент не раскрыл тему → добавь [[FAILED]] в конце

Общайся по-русски, дружелюбно, конкретно. Не затягивай диалог больше 3-4 обменов.`
  } else {
    systemPrompt = `Ты — преподаватель журналистики, помогаешь студентам подготовиться к экзамену.
Контекст: билет №${ticketId} "${ticketTitle}".
${ticketContent ? `\nМатериал билета:\n${ticketContent}` : ""}

Отвечай на вопросы студента по теме билета, объясняй простыми словами, приводи примеры. Общайся по-русски, кратко и по делу.`
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://lgu-exam.vercel.app",
      "X-Title": "LGU Exam Prep",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-exp:free",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return new Response(JSON.stringify({ error: err }), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    })
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

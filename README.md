# Госэкзамен — Реклама и Журналистика

Веб-приложение для подготовки к государственному экзамену. Два режима на каждый билет: тест из 10 случайных MCQ + открытый вопрос с оценкой от AI, либо только открытый вопрос.

## Стек

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS v4** + `@tailwindcss/typography` (prose)
- **react-markdown** — рендер теории билетов
- **OpenRouter** (`openai/gpt-4o-mini`) — AI-оценка открытых вопросов
- **localStorage** — хранение прогресса

## Структура данных

```
src/data/
├── tickets.ts                  ← DISCIPLINES конфиг + массивы билетов + типы
└── content/
    └── advertising_content.ts  ← теория 99 рекламных билетов (~522KB markdown)
```

### Добавить новую дисциплину

1. Создать массив билетов `const myTickets: Ticket[] = [...]`
2. Добавить одну строку в `DISCIPLINES` в `src/data/tickets.ts`:
```ts
my_discipline: { label: "Название", tickets: myTickets, total: 60 }
```
3. Добавить ключ в `DISCIPLINE_ORDER`

### Добавить теорию к дисциплине

1. Положить исходник в `tickets_raw.md` (или аналогичный файл)
2. Запустить `python3 extract_content.py` — создаст `src/data/content/advertising_content.ts`
3. Передать `contentMap` в нужную дисциплину в `DISCIPLINES`

### Сгенерировать MCQ-вопросы

Требует локального Ollama (`qwen2.5:32b`):
```bash
python3 generate_tickets.py
```
Пишет чекпоинт в `generate_checkpoint.json`, можно прерывать и продолжать.

## Роутинг

```
/                              — главная, выбор дисциплины
/ticket/[discipline]/[id]      — страница билета
```

Прогресс хранится в `localStorage` с ключами вида `advertising-1`, `journalism-5`.

## Локальный запуск

```bash
npm install
cp .env.local.example .env.local  # добавить OPENROUTER_API_KEY
npm run dev
```

## Переменные окружения

| Переменная | Описание |
|---|---|
| `OPENROUTER_API_KEY` | Ключ OpenRouter для AI-оценки открытых вопросов |

## Деплой

Vercel → GitHub main branch. Добавить `OPENROUTER_API_KEY` в Settings → Environment Variables проекта.

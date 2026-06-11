@AGENTS.md

# Проект: Госэкзамен (Реклама и Журналистика)

Приложение для подготовки к госэкзамену. Студент читает теорию, проходит 10 MCQ без ошибок, затем отвечает на открытый вопрос — его оценивает AI.

## Архитектура

- Роутинг: `/ticket/[discipline]/[id]` — discipline это ключ из `DISCIPLINES` (`advertising`, `journalism`)
- Данные: всё статично в TypeScript-файлах, никакой БД
- AI: OpenRouter proxy в `src/app/api/chat/route.ts`, модель `openai/gpt-4o-mini`
- Прогресс: localStorage, ключи `"advertising-1"`, `"journalism-5"` и т.д.

## Ключевые файлы

| Файл | Что делает |
|---|---|
| `src/data/tickets.ts` | DISCIPLINES конфиг, типы Ticket/MCQQuestion, массивы билетов |
| `src/data/content/advertising_content.ts` | Теория 99 рекламных билетов (auto-generated) |
| `src/app/page.tsx` | Главная: выбор дисциплины, сетка билетов |
| `src/app/ticket/[discipline]/[id]/page.tsx` | Страница билета: теория → MCQ → открытый вопрос |
| `src/components/quiz/QuizSession.tsx` | MCQ-тест (10 вопросов, zero tolerance) |
| `src/components/quiz/OpenQuestion.tsx` | Чат с AI-экзаменатором, ловит `[[PASSED]]`/`[[FAILED]]` |
| `src/hooks/useProgress.ts` | localStorage прогресс |
| `src/app/api/chat/route.ts` | OpenRouter proxy с SSE стримингом |
| `extract_content.py` | Парсит `tickets_raw.md` → `advertising_content.ts` |
| `generate_tickets.py` | Генерирует MCQ через Ollama (локально, одноразово) |

## Правила работы

- **Коммитить только после локального теста** — `npm run dev` + проверить руками
- Коммиты только от имени пользователя, без Co-Authored-By
- `tickets_raw.md` и `generate_checkpoint.json` в `.gitignore` — не коммитить
- `advertising_content.ts` генерируется скриптом — не редактировать вручную

## Добавить дисциплину (чеклист)

1. `src/data/tickets.ts` — добавить массив билетов и строку в `DISCIPLINES`
2. Добавить ключ в `DISCIPLINE_ORDER`
3. Если есть теория — запустить `extract_content.py` (адаптировать под новый файл), передать `contentMap`

## AI-оценка

System prompt в `route.ts` (mode=`evaluate`): строгий экзаменатор, до 2 уточняющих вопросов, вердикт `[[PASSED]]` или `[[FAILED]]` в конце сообщения. Сигналы ловит `OpenQuestion.tsx`.

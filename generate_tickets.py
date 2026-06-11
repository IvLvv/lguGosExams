#!/usr/bin/env python3
"""
One-time script: parses tickets_raw.md, generates MCQ questions via Ollama,
saves result to src/data/tickets.ts
"""

import re
import json
import urllib.request
import urllib.error
import sys
import time
import os

OLLAMA_URL = "http://localhost:11434/v1/chat/completions"
MODEL = "qwen2.5:32b"
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "src/data/tickets.ts")
CHECKPOINT_FILE = os.path.join(os.path.dirname(__file__), "generate_checkpoint.json")

# ─── Parse document ──────────────────────────────────────────────────────────

def parse_document(path):
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    toc = {}
    for line in lines[:210]:
        # handles both "[13.Title" (no space) and "[13. Title" (space)
        m = re.match(r'\[(\d+)\.\s*(.+?)(?:\s+\d+)?\]\(#', line.strip())
        if m:
            num = int(m.group(1))
            title = str(m.group(2)).strip().rstrip('.')
            toc[num] = title

    # Add tickets found in content but missing from TOC
    extra = {
        13: "Определение интегрированных коммуникаций, инструменты интегрированных коммуникаций",
        34: "Консалтинговый процесс и консалтинговый проект: сущность, этапы, специфика",
        99: "Целевая аудитория рекламной кампании: понятие целевой аудитории, виды потребителей, сегментирование рынка",
    }
    for num, title in extra.items():
        if num not in toc:
            toc[num] = title

    content_start = 0
    for i, line in enumerate(lines):
        if re.match(r'^1\.\s+Происхождение', line):
            content_start = i
            break

    content_lines = lines[content_start:]

    # Pass 1: find all lines that look like a ticket header "N. ..." where N is in toc
    # We look for: "N. ", "N.X" (no space), "**N. " — all at line start
    # We do NOT use bare title fallback to avoid matching inside other tickets
    ticket_positions = {}

    # Special hardcoded line offsets for tickets that use reset numbering (e.g. "1. Title")
    # Key: ticket num → approximate line in content_lines where the title appears
    # These are filled in pass 2 below
    reset_numbered = {}  # num -> title_key for pass-2 matching

    for i, raw_line in enumerate(content_lines):
        line = raw_line.strip()
        m = re.match(r'^\*{0,2}(\d+)\.\s*\S', line)
        if not m:
            continue
        num = int(m.group(1))
        if num not in toc:
            continue
        # Require first 2 words of the TOC title to appear in line
        title_words = [w for w in toc[num].split() if len(w) > 3]
        check1 = title_words[0][:10].lower() if len(title_words) > 0 else ""
        check2 = title_words[1][:10].lower() if len(title_words) > 1 else check1
        if check1 in line.lower() and check2 in line.lower():
            if num not in ticket_positions:
                ticket_positions[num] = i

    # Pass 2: for tickets not yet found (reset-numbered or bold-only headers)
    # search by first 25 chars of title, only in lines starting with a digit
    for num, title in sorted(toc.items()):
        if num in ticket_positions:
            continue
        title_key = str(title[:25]).strip()
        escaped = re.escape(title_key)
        for i, raw_line in enumerate(content_lines):
            line = raw_line.strip()
            if not re.match(r'^\*{0,2}\d+\.', line):
                continue
            if re.search(escaped, line, re.IGNORECASE):
                ticket_positions[num] = i
                break

    sorted_nums = sorted(ticket_positions.keys())
    tickets = {}
    for i, num in enumerate(sorted_nums):
        start = ticket_positions[num]
        end = ticket_positions[sorted_nums[i+1]] if i+1 < len(sorted_nums) else len(content_lines)
        section_lines = content_lines[start:end]
        body = ''.join(section_lines[1:]).strip()
        tickets[num] = {'id': num, 'title': toc[num], 'content': body}

    return tickets

# ─── Ollama call ─────────────────────────────────────────────────────────────

def call_ollama(prompt, max_tokens=4000, retries=3):
    payload = json.dumps({
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
        "temperature": 0.3,
        "stream": False,
    }).encode('utf-8')

    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                OLLAMA_URL,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=180) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                return data['choices'][0]['message']['content']
        except Exception as e:
            print(f"    Attempt {attempt+1} failed: {e}")
            if attempt < retries - 1:
                time.sleep(5)
    return None

# ─── Generate questions for one ticket ───────────────────────────────────────

MCQ_PROMPT = """Ты генерируешь вопросы для экзаменационного теста по курсу "Реклама и связи с общественностью".

Тема билета: "{title}"

Текст билета:
---
{content}
---

Сгенерируй РОВНО 30 вопросов с выбором ответа (MCQ) и 5 открытых вопросов на понимание темы.

ТРЕБОВАНИЯ К MCQ:
- 4 варианта ответа (A, B, C, D)
- Один однозначно правильный ответ
- Вопросы разной сложности: фактические, понятийные, аналитические
- Основаны ТОЛЬКО на тексте билета
- На русском языке

ФОРМАТ ОТВЕТА — только JSON, без пояснений:
{{
  "mcq": [
    {{
      "question": "Текст вопроса?",
      "options": ["Вариант A", "Вариант B", "Вариант C", "Вариант D"],
      "correct": 0
    }}
  ],
  "open": [
    "Открытый вопрос 1?",
    "Открытый вопрос 2?",
    "Открытый вопрос 3?",
    "Открытый вопрос 4?",
    "Открытый вопрос 5?"
  ]
}}

correct — индекс правильного ответа (0=A, 1=B, 2=C, 3=D).
Верни ТОЛЬКО JSON, без markdown-блоков и пояснений."""

def generate_for_ticket(ticket):
    content = ticket['content']
    # Truncate very long content to ~4000 chars
    if len(content) > 4000:
        content = content[:4000] + "\n...[текст сокращён]"

    prompt = MCQ_PROMPT.format(title=ticket['title'], content=content)
    raw = call_ollama(prompt, max_tokens=5000)
    if not raw:
        return None

    # Extract JSON from response
    raw = raw.strip()
    # Remove markdown code blocks if present
    raw = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
    raw = re.sub(r'\s*```$', '', raw, flags=re.MULTILINE)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        # Try to find JSON object in response
        m = re.search(r'\{[\s\S]*\}', raw)
        if m:
            try:
                data = json.loads(m.group(0))
            except:
                return None
        else:
            return None

    mcq = data.get('mcq', [])
    open_qs = data.get('open', [])

    # Validate
    if len(mcq) < 10 or len(open_qs) < 3:
        print(f"    WARNING: got {len(mcq)} MCQ, {len(open_qs)} open — too few!")

    return {'mcq': mcq[:30], 'open': open_qs[:5]}

# ─── TypeScript output ────────────────────────────────────────────────────────

def escape_ts(s):
    return s.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')

def ticket_to_ts(ticket_data, questions):
    num = ticket_data['id']
    title = escape_ts(ticket_data['title'])

    mcq_lines = []
    for q in questions['mcq']:
        question = escape_ts(q['question'])
        opts = [escape_ts(str(o)) for o in q['options']]
        correct = int(q['correct'])
        opts_str = ', '.join(f'"{o}"' for o in opts[:4])
        mcq_lines.append(
            f'      {{ question: "{question}", options: [{opts_str}], correct: {correct} }}'
        )

    open_lines = [f'      "{escape_ts(str(q))}"' for q in questions['open'][:5]]

    difficulty = 1 if num <= 30 else (2 if num <= 70 else 3)

    return f"""  {{
    id: {num},
    title: "{title}",
    difficulty: {difficulty},
    questions: [
{chr(10).join(mcq_lines)}
    ],
    openQuestions: [
{chr(10).join(open_lines)}
    ],
  }}"""

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    doc_path = os.path.join(os.path.dirname(__file__), "tickets_raw.md")
    print(f"Parsing {doc_path}...")
    tickets = parse_document(doc_path)
    print(f"Parsed {len(tickets)} tickets")

    # Load checkpoint
    checkpoint = {}
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, 'r', encoding='utf-8') as f:
            checkpoint = json.load(f)
        print(f"Resuming from checkpoint: {len(checkpoint)} tickets already done")

    sorted_nums = sorted(tickets.keys())
    results = dict(checkpoint)

    for num in sorted_nums:
        if str(num) in checkpoint:
            print(f"[{num:3d}/99] SKIP (cached)")
            continue

        ticket = tickets[num]
        print(f"[{num:3d}/99] Generating: {ticket['title'][:55]}...", end='', flush=True)
        t0 = time.time()
        qs = generate_for_ticket(ticket)
        elapsed = time.time() - t0

        if qs:
            results[str(num)] = qs
            # Save checkpoint after each ticket
            with open(CHECKPOINT_FILE, 'w', encoding='utf-8') as f:
                json.dump(results, f, ensure_ascii=False)
            print(f" ✓ {len(qs['mcq'])} MCQ, {len(qs['open'])} open ({elapsed:.0f}s)")
        else:
            print(f" ✗ FAILED — skipping")

    # Build TypeScript file
    print(f"\nBuilding {OUTPUT_FILE}...")
    ts_parts = []
    for num in sorted_nums:
        ticket = tickets[num]
        key = str(num)
        if key in results:
            ts_parts.append(ticket_to_ts(ticket, results[key]))
        else:
            # Placeholder for failed tickets
            ts_parts.append(f"""  {{
    id: {num},
    title: "{escape_ts(ticket['title'])}",
    difficulty: 1,
    questions: [],
    openQuestions: [],
  }}""")

    ts_content = f"""// AUTO-GENERATED by generate_tickets.py — do not edit manually

export interface MCQQuestion {{
  question: string
  options: [string, string, string, string]
  correct: 0 | 1 | 2 | 3
}}

export interface Ticket {{
  id: number
  title: string
  difficulty: 1 | 2 | 3
  questions: MCQQuestion[]
  openQuestions: string[]
}}

export const totalTickets = {len(tickets)}
export const QUESTIONS_PER_SESSION = 10
export const OPEN_QUESTIONS_POOL = 5

export const tickets: Ticket[] = [
{',\n'.join(ts_parts)}
]
"""

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(ts_content)

    done = sum(1 for n in sorted_nums if str(n) in results)
    print(f"\nDone! {done}/{len(tickets)} tickets generated → {OUTPUT_FILE}")
    if done < len(tickets):
        print(f"Re-run the script to retry {len(tickets)-done} failed tickets.")

if __name__ == '__main__':
    main()

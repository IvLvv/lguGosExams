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

OLLAMA_URL = "http://localhost:11434/api/chat"
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
        "stream": True,
        "options": {
            "num_ctx": 4096,
            "num_predict": max_tokens,
            "temperature": 0.3,
        },
    }).encode('utf-8')

    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                OLLAMA_URL,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            chunks = []
            with urllib.request.urlopen(req, timeout=120) as resp:
                for raw_line in resp:
                    line = raw_line.decode('utf-8').strip()
                    if not line:
                        continue
                    try:
                        chunk = json.loads(line)
                        token = chunk.get('message', {}).get('content', '')
                        if token:
                            chunks.append(token)
                            print('.', end='', flush=True)
                        if chunk.get('done'):
                            break
                    except Exception:
                        pass
            return ''.join(chunks)
        except Exception as e:
            print(f"\n    Attempt {attempt+1} failed: {e}")
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

Сгенерируй РОВНО 15 вопросов с выбором ответа (MCQ).

ТРЕБОВАНИЯ:
- 4 варианта ответа (A, B, C, D)
- Один однозначно правильный ответ
- Вопросы разной сложности: фактические, понятийные, аналитические
- Основаны ТОЛЬКО на тексте билета
- На русском языке
- ЗАПРЕЩЕНО использовать фразы "согласно тексту", "по тексту", "в тексте", "как указано", "согласно материалу" — вопрос должен быть самодостаточным, как будто текста нет

ФОРМАТ ОТВЕТА — только JSON, без пояснений:
[
  {{
    "question": "Текст вопроса?",
    "options": ["Вариант A", "Вариант B", "Вариант C", "Вариант D"],
    "correct": 0
  }}
]

correct — индекс правильного ответа (0=A, 1=B, 2=C, 3=D).
Верни ТОЛЬКО JSON-массив, без markdown-блоков и пояснений."""

OPEN_PROMPT = """Ты генерируешь открытые вопросы для экзамена по курсу "Реклама и связи с общественностью".

Тема билета: "{title}"

Текст билета:
---
{content}
---

Сгенерируй РОВНО 5 открытых вопросов на понимание темы. Вопросы должны требовать развёрнутого ответа.
ЗАПРЕЩЕНО использовать фразы "согласно тексту", "по тексту", "в тексте", "как указано" — вопрос должен быть самодостаточным.

ФОРМАТ ОТВЕТА — только JSON, без пояснений:
["Вопрос 1?", "Вопрос 2?", "Вопрос 3?", "Вопрос 4?", "Вопрос 5?"]

Верни ТОЛЬКО JSON-массив строк, без markdown-блоков и пояснений."""

def parse_json(raw):
    raw = raw.strip()
    raw = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
    raw = re.sub(r'\s*```$', '', raw, flags=re.MULTILINE)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r'[\[\{][\s\S]*[\]\}]', raw)
        if m:
            try:
                return json.loads(m.group(0))
            except:
                pass
    return None

def generate_for_ticket(ticket):
    content = ticket['content']
    if len(content) > 2000:
        content = content[:2000] + "\n...[текст сокращён]"

    ctx = {'title': ticket['title'], 'content': content}

    # Request 1: first 15 MCQ
    raw1 = call_ollama(MCQ_PROMPT.format(**ctx), max_tokens=2000)
    mcq1 = parse_json(raw1) if raw1 else None
    if not isinstance(mcq1, list):
        print(f"    WARNING: MCQ batch 1 parse failed")
        mcq1 = []

    # Request 2: second 15 MCQ
    raw2 = call_ollama(MCQ_PROMPT.format(**ctx), max_tokens=2000)
    mcq2 = parse_json(raw2) if raw2 else None
    if not isinstance(mcq2, list):
        print(f"    WARNING: MCQ batch 2 parse failed")
        mcq2 = []

    mcq = (mcq1 + mcq2)[:30]

    # Request 3: open questions
    raw3 = call_ollama(OPEN_PROMPT.format(**ctx), max_tokens=300)
    open_qs = parse_json(raw3) if raw3 else None
    if not isinstance(open_qs, list):
        print(f"    WARNING: open questions parse failed")
        open_qs = []

    if len(mcq) < 10 or len(open_qs) < 3:
        print(f"    WARNING: got {len(mcq)} MCQ, {len(open_qs)} open — too few!")

    return {'mcq': mcq[:30], 'open': [str(q) for q in open_qs[:5]]}

# ─── TypeScript output ────────────────────────────────────────────────────────

def escape_ts(s):
    return s.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')

def ticket_to_ts(ticket_data, questions):
    num = ticket_data['id']
    title = escape_ts(ticket_data['title'])

    mcq_lines = []
    for q in questions['mcq']:
        question = escape_ts(q['question'])
        opts = [escape_ts(str(o)) for o in (q.get('options') or q.get('output') or [])]
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
    # Usage:
    #   python generate_tickets.py          — full run (skip cached)
    #   python generate_tickets.py 5        — test single ticket, print JSON only
    #   python generate_tickets.py --redo 1 2 3  — force-regenerate specific tickets
    redo = set()
    only = None
    args = sys.argv[1:]
    if args and args[0] == '--redo':
        redo = {int(x) for x in args[1:]}
    elif args:
        only = int(args[0])

    doc_path = os.path.join(os.path.dirname(__file__), "tickets_raw.md")
    print(f"Parsing {doc_path}...")
    tickets = parse_document(doc_path)
    print(f"Parsed {len(tickets)} tickets")

    # Load checkpoint
    checkpoint = {}
    if os.path.exists(CHECKPOINT_FILE) and not only:
        with open(CHECKPOINT_FILE, 'r', encoding='utf-8') as f:
            checkpoint = json.load(f)
        print(f"Resuming from checkpoint: {len(checkpoint)} tickets already done")
    if redo:
        for n in redo:
            checkpoint.pop(str(n), None)
        print(f"Force-redo: {sorted(redo)}")

    sorted_nums = [only] if only else sorted(tickets.keys())
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

    # In single-ticket test mode: just print JSON and exit
    if only:
        key = str(only)
        if key in results:
            print(f"\n{'─'*60}")
            print(json.dumps(results[key], ensure_ascii=False, indent=2))
        return

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

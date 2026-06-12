#!/usr/bin/env python3
"""
Generate MCQ explanations via remote Ollama and insert them into tickets.ts.
Run: python3 generate_explanations.py
Resume-safe: skips tickets that already have explanations.
"""

import re, json, urllib.request, time, sys, os

OLLAMA      = "http://192.168.0.240:11434/api/chat"
MODEL       = "qwen2.5:32b"
TICKETS     = os.path.join(os.path.dirname(__file__), "src/data/tickets.ts")
CONTENT     = os.path.join(os.path.dirname(__file__), "src/data/content/advertising_content.ts")
CHECKPOINT  = os.path.join(os.path.dirname(__file__), "explanations_checkpoint.json")
START_ID    = 11
END_ID      = 100


# ── I/O helpers ──────────────────────────────────────────────────────────────

def read_file(path):
    with open(path, encoding="utf-8") as f:
        return f.read()

def write_file(path, text):
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)

def load_checkpoint():
    if os.path.exists(CHECKPOINT):
        with open(CHECKPOINT) as f:
            return json.load(f)
    return {}

def save_checkpoint(data):
    with open(CHECKPOINT, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ── Ollama ────────────────────────────────────────────────────────────────────

def ollama(prompt, retries=3):
    payload = json.dumps({
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "stream": True,
        "options": {
            "num_ctx": 8192,
            "num_predict": 4000,
            "temperature": 0.3,
        },
    }).encode("utf-8")
    req = urllib.request.Request(
        OLLAMA, data=payload,
        headers={"Content-Type": "application/json"}
    )
    for attempt in range(retries):
        try:
            chunks = []
            with urllib.request.urlopen(req, timeout=300) as resp:
                for raw_line in resp:
                    line = raw_line.decode("utf-8").strip()
                    if not line:
                        continue
                    try:
                        chunk = json.loads(line)
                        token = chunk.get("message", {}).get("content", "")
                        if token:
                            chunks.append(token)
                            print(".", end="", flush=True)
                        if chunk.get("done"):
                            break
                    except Exception:
                        pass
            return "".join(chunks)
        except Exception as e:
            if attempt == retries - 1:
                raise
            print(f"\n  retry {attempt+1}: {e}")
            time.sleep(5)


# ── Extract data from source files ───────────────────────────────────────────

def get_theory(content_text, ticket_id):
    """Extract theory markdown for a ticket id from advertising_content.ts"""
    lines = content_text.splitlines()
    # Find the line:  <id>: `
    start_pattern = re.compile(rf'^\s+{ticket_id}:\s*`')
    in_block = False
    collected = []
    for line in lines:
        if not in_block:
            if start_pattern.match(line):
                in_block = True
                # grab text after the opening backtick
                after = re.sub(rf'^\s+{ticket_id}:\s*`', '', line)
                if after.endswith('`,'):
                    collected.append(after[:-2])
                    break
                collected.append(after)
        else:
            if line.rstrip().endswith('`,'):
                collected.append(line.rstrip()[:-2])
                break
            collected.append(line)
    return "\n".join(collected)[:4000]  # cap to keep prompt reasonable


def get_questions(tickets_text, ticket_id):
    """Return list of {question, options, correct_text} for ticket_id"""
    lines = tickets_text.splitlines()
    in_ticket = False
    questions = []
    q_re = re.compile(
        r'\{ question: "(.*?)", options: \["(.*?)", "(.*?)", "(.*?)", "(.*?)"\], correct: ([0-3])'
    )
    for line in lines:
        if f'    id: {ticket_id},' in line:
            in_ticket = True
        elif in_ticket and f'    id: {ticket_id + 1},' in line:
            break
        elif in_ticket and '{ question:' in line:
            m = q_re.search(line)
            if m:
                q, o0, o1, o2, o3, c = m.groups()
                opts = [o0, o1, o2, o3]
                questions.append({"question": q, "options": opts, "correct_text": opts[int(c)]})
    return questions


def ticket_has_explanations(tickets_text, ticket_id):
    lines = tickets_text.splitlines()
    in_ticket = False
    for line in lines:
        if f'    id: {ticket_id},' in line:
            in_ticket = True
        elif in_ticket and f'    id: {ticket_id + 1},' in line:
            break
        elif in_ticket and 'explanation:' in line:
            return True
    return False


# ── Generate via Ollama ───────────────────────────────────────────────────────

def build_prompt(theory, questions):
    q_lines = "\n".join(
        f'{i+1}. {q["question"]}\n   Правильный ответ: {q["correct_text"]}'
        for i, q in enumerate(questions)
    )
    return f"""Ты помогаешь студентам готовиться к экзамену по рекламе.

Теория:
{theory}

Ниже {len(questions)} вопросов с правильными ответами. Для каждого напиши объяснение — 1-2 предложения, почему этот ответ верный, опираясь на теорию. Отвечай на русском.

{q_lines}

Верни ТОЛЬКО JSON-массив из {len(questions)} строк. Никакого markdown, никакого лишнего текста. Пример:
["Объяснение 1.", "Объяснение 2.", ...]"""


def parse_json_array(response):
    text = response.strip()
    text = re.sub(r'^```[a-z]*\n?', '', text)
    text = re.sub(r'\n?```$', '', text.strip())
    return json.loads(text)


def generate(theory, questions, retries=2):
    for attempt in range(retries):
        prompt = build_prompt(theory, questions)
        raw = ollama(prompt)
        try:
            result = parse_json_array(raw)
            # Accept exact match
            if len(result) == len(questions):
                return result
            # If off by one — pad or trim
            if len(result) == len(questions) - 1:
                result.append("Правильный ответ следует из теории билета.")
                return result
            if len(result) == len(questions) + 1:
                return result[:len(questions)]
            raise ValueError(f"got {len(result)} explanations, expected {len(questions)}")
        except Exception as e:
            print(f"\n  attempt {attempt+1} parse error: {e}")
            if attempt == retries - 1:
                print(f"  raw (first 300): {raw[:300]}")
                raise


# ── Insert explanations into tickets.ts ──────────────────────────────────────

def insert_into_file(tickets_text, ticket_id, explanations):
    lines = tickets_text.splitlines(keepends=True)
    question_indices = []
    in_ticket = False
    for i, line in enumerate(lines):
        if f'    id: {ticket_id},' in line:
            in_ticket = True
        elif in_ticket and f'    id: {ticket_id + 1},' in line:
            break
        elif in_ticket and '      { question:' in line:
            question_indices.append(i)

    if len(question_indices) != len(explanations):
        raise ValueError(f"ticket {ticket_id}: {len(question_indices)} question lines, {len(explanations)} explanations")

    for line_i, exp in zip(question_indices, explanations):
        line = lines[line_i].rstrip('\n')
        escaped = exp.replace('\\', '\\\\').replace('"', '\\"')
        if line.rstrip().endswith('},'):
            lines[line_i] = line.rstrip()[:-2] + f', explanation: "{escaped}" }},' + '\n'
        else:
            lines[line_i] = line.rstrip()[:-1] + f', explanation: "{escaped}" }}' + '\n'

    return "".join(lines)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    checkpoint = load_checkpoint()
    tickets_text = read_file(TICKETS)
    content_text = read_file(CONTENT)

    ids_to_process = [
        tid for tid in range(START_ID, END_ID + 1)
        if str(tid) not in checkpoint and not ticket_has_explanations(tickets_text, tid)
    ]

    print(f"Tickets to process: {len(ids_to_process)} ({ids_to_process[:5]}...)")

    for tid in ids_to_process:
        print(f"[{tid}/{END_ID}] Generating...", end=" ", flush=True)
        theory = get_theory(content_text, tid)
        questions = get_questions(tickets_text, tid)

        if not questions:
            print(f"no questions — skip")
            continue

        try:
            t0 = time.time()
            exps = generate(theory, questions)
            elapsed = time.time() - t0
            print(f"{len(exps)} exps in {elapsed:.0f}s")

            checkpoint[str(tid)] = exps
            save_checkpoint(checkpoint)

        except Exception as e:
            print(f"ERROR: {e}")
            continue

    # Insert all checkpointed explanations into tickets.ts
    print("\nInserting into tickets.ts...")
    tickets_text = read_file(TICKETS)  # re-read in case it changed
    for tid_str, exps in sorted(checkpoint.items(), key=lambda x: int(x[0])):
        tid = int(tid_str)
        if ticket_has_explanations(tickets_text, tid):
            continue
        try:
            tickets_text = insert_into_file(tickets_text, tid, exps)
            print(f"  Ticket {tid}: inserted {len(exps)}")
        except Exception as e:
            print(f"  Ticket {tid}: ERROR {e}")

    write_file(TICKETS, tickets_text)
    print("Done. Run: npx tsc --noEmit")


if __name__ == "__main__":
    main()

"""يبني بنك أسئلة عربي محلي للعبة من بيانات Open Trivia DB، مع ترجمة منظمة عبر نموذج لغة."""

from __future__ import annotations

import concurrent.futures
import html
import json
import os
import random
import time
import urllib.parse
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "client/src/game/questionBank.ts"
META = ROOT / "client/src/game/questionBank.meta.json"
TARGET = 1050
API = "https://opentdb.com"
MODEL = "gpt-5-nano"

CATEGORY_AR = {
    "General Knowledge": "معلومات عامة",
    "Entertainment: Books": "كتب وأدب",
    "Entertainment: Film": "أفلام",
    "Entertainment: Music": "موسيقى",
    "Entertainment: Musicals & Theatres": "مسرح وفنون",
    "Entertainment: Television": "تلفزيون",
    "Entertainment: Video Games": "ألعاب فيديو",
    "Entertainment: Board Games": "ألعاب ذهنية",
    "Science & Nature": "علوم وطبيعة",
    "Science: Computers": "تقنية",
    "Science: Mathematics": "رياضيات",
    "Mythology": "أساطير",
    "Sports": "رياضة",
    "Geography": "جغرافيا",
    "History": "تاريخ",
    "Art": "فن",
    "Celebrities": "شخصيات مشهورة",
    "Animals": "حيوانات",
    "Vehicles": "مركبات",
    "Entertainment: Comics": "قصص مصورة",
    "Science: Gadgets": "تقنية",
    "Entertainment: Cartoon & Animations": "رسوم متحركة",
}

CATEGORY_IDS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 27, 28, 29, 30, 31, 32]
BLOCKED = {"porn", "sexual", "sex", "nude", "erotic", "rape", "suicide", "kill yourself"}


def clean(value: str) -> str:
    return html.unescape(urllib.parse.unquote(value)).replace("\u00a0", " ").strip()


def usable(question: dict) -> bool:
    values = [question["question"], question["correct_answer"], *question["incorrect_answers"]]
    joined = " ".join(values).lower()
    options = [question["correct_answer"], *question["incorrect_answers"]]
    return not any(term in joined for term in BLOCKED) and len(set(options)) == 4 and all(len(v) < 160 for v in values)


def get_token() -> str:
    response = requests.get(f"{API}/api_token.php?command=request", timeout=30)
    response.raise_for_status()
    payload = response.json()
    if payload.get("response_code") != 0:
        raise RuntimeError("لم يتم الحصول على رمز جلسة لمصدر الأسئلة")
    return payload["token"]


def fetch_source_questions() -> list[dict]:
    token = get_token()
    collected: list[dict] = []
    seen: set[str] = set()
    for category_id in CATEGORY_IDS:
        response = requests.get(
            f"{API}/api.php",
            params={"amount": 50, "category": category_id, "type": "multiple", "encode": "url3986", "token": token},
            timeout=40,
        )
        response.raise_for_status()
        payload = response.json()
        for item in payload.get("results", []):
            item = {key: clean(value) if isinstance(value, str) else [clean(x) for x in value] for key, value in item.items()}
            key = item["question"].casefold()
            if key not in seen and usable(item):
                seen.add(key)
                collected.append(item)
        if len(collected) >= TARGET:
            break
        time.sleep(0.25)
    if len(collected) < 1000:
        raise RuntimeError(f"المصدر أتاح {len(collected)} سؤالًا صالحًا فقط، وهو أقل من 1000")
    random.Random(1927).shuffle(collected)
    return collected[:TARGET]


def prepare_item(item: dict, index: int) -> dict:
    options = [item["correct_answer"], *item["incorrect_answers"]]
    random.Random(1000 + index).shuffle(options)
    return {
        "id": f"q-{index + 1:04d}",
        "category": CATEGORY_AR.get(item["category"], "معلومات عامة"),
        "difficulty": {"easy": "سهل", "medium": "متوسط", "hard": "صعب"}.get(item["difficulty"], "متوسط"),
        "question_en": item["question"],
        "options_en": options,
        "correctIndex": options.index(item["correct_answer"]),
    }


SCHEMA = {
    "name": "arabic_quiz_batch",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "question": {"type": "string"},
                        "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                    },
                    "required": ["id", "question", "options"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["items"],
        "additionalProperties": False,
    },
}


def translate_batch(batch: list[dict]) -> list[dict]:
    payload_items = [{"id": item["id"], "question": item["question_en"], "options": item["options_en"]} for item in batch]
    prompt = (
        "ترجم أسئلة الاختيار من متعدد التالية من الإنجليزية إلى العربية الفصحى السهلة للعبة مسابقات. "
        "لا تغيّر حقيقة السؤال، ولا تضف معلومات، ولا تغيّر ترتيب الاختيارات. ترجم الاختيارات الأربعة كلها، "
        "وأبقِ معرف السؤال id كما هو. لا تضع علامات اقتباس حول النص إلا إذا كانت موجودة في الأصل. "
        "تجنب اللغة العامية، واجعل السؤال واضحًا ومختصرًا. البيانات: "
        + json.dumps(payload_items, ensure_ascii=False)
    )
    headers = {"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}", "Content-Type": "application/json"}
    request = {
        "model": MODEL,
        "messages": [{"role": "system", "content": "أنت مترجم دقيق لمحتوى مسابقات ثقافية. أخرج JSON فقط."}, {"role": "user", "content": prompt}],
        "response_format": {"type": "json_schema", "json_schema": SCHEMA},
        "max_completion_tokens": 12000,
    }
    for attempt in range(3):
        response = requests.post(f"{os.environ['OPENAI_API_BASE'].rstrip('/')}/chat/completions", headers=headers, json=request, timeout=160)
        if response.ok:
            data = json.loads(response.json()["choices"][0]["message"]["content"])
            translated = data["items"]
            expected_ids = [item["id"] for item in batch]
            if [item["id"] for item in translated] == expected_ids and all(len(item["options"]) == 4 for item in translated):
                return translated
        time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"فشل تحويل دفعة تبدأ بالسؤال {batch[0]['id']}")


def write_bank(items: list[dict]) -> None:
    output = """/**\n * بنك أسئلة عربي محلي؛ المصدر: Open Trivia Database (CC BY-SA 4.0)، ثم ترجمة آلية منظمة ومراجعة بنيوية.\n * يحتوي هذا الإصدار على أكثر من ألف سؤال اختياري موزع على فئات وصعوبات.\n */\n\nexport type QuizQuestion = {\n  id: string;\n  category: string;\n  difficulty: \"سهل\" | \"متوسط\" | \"صعب\";\n  question: string;\n  options: [string, string, string, string];\n  correctIndex: number;\n};\n\nexport const QUESTION_BANK: QuizQuestion[] = """
    output += json.dumps(items, ensure_ascii=False, indent=2)
    output += " as QuizQuestion[];\n\nexport const QUESTION_BANK_SIZE = QUESTION_BANK.length;\n"
    OUTPUT.write_text(output, encoding="utf-8")
    distribution: dict[str, int] = {}
    for item in items:
        distribution[item["category"]] = distribution.get(item["category"], 0) + 1
    META.write_text(json.dumps({"count": len(items), "categories": distribution, "source": "Open Trivia Database CC BY-SA 4.0"}, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    raw = fetch_source_questions()
    prepared = [prepare_item(item, index) for index, item in enumerate(raw)]
    batches = [prepared[index:index + 25] for index in range(0, len(prepared), 25)]
    translated: list[dict] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(translate_batch, batch): batch[0]["id"] for batch in batches}
        for future in concurrent.futures.as_completed(futures):
            translated.extend(future.result())
            print(f"تمت ترجمة دفعة تبدأ بـ {futures[future]}", flush=True)
    by_id = {item["id"]: item for item in translated}
    final = []
    for source in prepared:
        arabic = by_id[source["id"]]
        final.append({
            "id": source["id"],
            "category": source["category"],
            "difficulty": source["difficulty"],
            "question": arabic["question"],
            "options": arabic["options"],
            "correctIndex": source["correctIndex"],
        })
    if len(final) < 1000 or len({item["id"] for item in final}) != len(final):
        raise RuntimeError("فشل تحقق العدد أو فريدة المعرفات في بنك الأسئلة")
    write_bank(final)
    print(f"تم إنشاء {len(final)} سؤالًا في {OUTPUT}")


if __name__ == "__main__":
    main()

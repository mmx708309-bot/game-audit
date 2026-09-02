"""يجمع حقائق عربية عامة من Wikidata وينشئ ملف TypeScript ثابتًا للعبة.

المصدر مرخّص CC0. لا يُستخرج أي محتوى ديني؛ تقتصر الاستعلامات على المدن والرياضة
والشخصيات التاريخية والمعالم الطبيعية فقط.
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "client/src/game/generalFacts.ts"
CACHE = ROOT / ".quiz-facts-cache"
ENDPOINT = "https://query.wikidata.org/sparql"
HEADERS = {"Accept": "application/sparql-results+json", "User-Agent": "TahaddiQuiz/1.0 (quiz data pipeline)"}


def query(sparql: str) -> list[dict[str, str]]:
    error: Exception | None = None
    for attempt in range(3):
        try:
            response = requests.get(ENDPOINT, params={"query": sparql, "format": "json"}, headers=HEADERS, timeout=90)
            response.raise_for_status()
            rows = response.json()["results"]["bindings"]
            return [{key: value["value"].strip() for key, value in row.items()} for row in rows]
        except requests.RequestException as exc:
            error = exc
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"تعذر استدعاء مصدر Wikidata بعد المحاولات: {error}")


def cached(name: str, loader) -> list[dict[str, str]]:
    CACHE.mkdir(exist_ok=True)
    path = CACHE / f"{name}.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    rows = loader()
    path.write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")
    return rows


def unique(rows: list[dict[str, str]], fields: tuple[str, ...], limit: int) -> list[dict[str, str]]:
    result: list[dict[str, str]] = []
    seen: set[tuple[str, ...]] = set()
    for row in rows:
        key = tuple(row.get(field, "") for field in fields)
        if all(key) and key not in seen:
            seen.add(key)
            result.append(row)
        if len(result) >= limit:
            break
    return result


def paged_cities(target: int) -> list[dict[str, str]]:
    all_rows: list[dict[str, str]] = []
    page_size = 2500
    offset = 0
    while len(all_rows) < target:
        rows = query(f"""
          SELECT ?cityLabel ?countryLabel ?continentLabel WHERE {{
            ?city wdt:P31 wd:Q515; wdt:P17 ?country; rdfs:label ?cityLabel.
            ?country wdt:P30 ?continent; rdfs:label ?countryLabel.
            ?continent rdfs:label ?continentLabel.
            FILTER(LANG(?cityLabel) = \"ar\")
            FILTER(LANG(?countryLabel) = \"ar\")
            FILTER(LANG(?continentLabel) = \"ar\")
          }} ORDER BY ?city LIMIT {page_size} OFFSET {offset}
        """)
        if not rows:
            break
        all_rows.extend(rows)
        offset += page_size
        time.sleep(0.7)
    return unique(all_rows, ("cityLabel", "countryLabel", "continentLabel"), target)


def main() -> None:
    cities = cached("cities", lambda: paged_cities(10_000))
    sports = cached("sports", lambda: unique(query("""
      SELECT ?personLabel ?sportLabel WHERE {
        ?person wdt:P106 wd:Q2066131; wdt:P641 ?sport; rdfs:label ?personLabel.
        ?sport rdfs:label ?sportLabel.
        FILTER(LANG(?personLabel) = "ar")
        FILTER(LANG(?sportLabel) = "ar")
      } LIMIT 1800
    """), ("personLabel", "sportLabel"), 1200))
    time.sleep(0.7)
    nature = cached("nature", lambda: unique(
      query("""
        SELECT ?featureLabel ?countryLabel WHERE {
          ?feature wdt:P31 wd:Q8502; wdt:P17 ?country; rdfs:label ?featureLabel.
          ?country rdfs:label ?countryLabel.
          FILTER(LANG(?featureLabel) = "ar")
          FILTER(LANG(?countryLabel) = "ar")
        } LIMIT 800
      """) + query("""
        SELECT ?featureLabel ?countryLabel WHERE {
          ?feature wdt:P31 wd:Q355304; wdt:P17 ?country; rdfs:label ?featureLabel.
          ?country rdfs:label ?countryLabel.
          FILTER(LANG(?featureLabel) = "ar")
          FILTER(LANG(?countryLabel) = "ar")
        } LIMIT 800
      """), ("featureLabel", "countryLabel"), 1000))
    time.sleep(0.7)
    history = cached("history", lambda: unique(query("""
      SELECT ?personLabel ?countryLabel ?occupationLabel WHERE {
        ?person wdt:P569 ?birth; wdt:P27 ?country; wdt:P106 ?occupation; rdfs:label ?personLabel.
        ?country rdfs:label ?countryLabel.
        ?occupation rdfs:label ?occupationLabel.
        FILTER(YEAR(?birth) < 1900)
        FILTER(LANG(?personLabel) = "ar")
        FILTER(LANG(?countryLabel) = "ar")
        FILTER(LANG(?occupationLabel) = "ar")
      } LIMIT 1800
    """), ("personLabel", "countryLabel", "occupationLabel"), 1200))

    if len(cities) < 4_500 or len(sports) < 1_000 or len(nature) < 500 or len(history) < 1_000:
        raise RuntimeError(f"بيانات غير كافية: cities={len(cities)} sports={len(sports)} nature={len(nature)} history={len(history)}")

    export = """/** حقائق عربية عامة مستخرجة من Wikidata Query Service (CC0). */\n\n"""
    export += "export const CITY_FACTS = " + json.dumps(cities, ensure_ascii=False) + " as const;\n\n"
    export += "export const SPORT_FACTS = " + json.dumps(sports, ensure_ascii=False) + " as const;\n\n"
    export += "export const NATURE_FACTS = " + json.dumps(nature, ensure_ascii=False) + " as const;\n\n"
    export += "export const HISTORY_FACTS = " + json.dumps(history, ensure_ascii=False) + " as const;\n"
    OUTPUT.write_text(export, encoding="utf-8")
    print(json.dumps({"cities": len(cities), "sports": len(sports), "nature": len(nature), "history": len(history)}, ensure_ascii=False))


if __name__ == "__main__":
    main()

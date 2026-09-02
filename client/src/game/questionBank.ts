/**
 * بنك أسئلة محلي دقيق: حساب ومعلومات عامة عربية، مع حقائق من Wikidata (CC0).
 * يولّد المحتوى محليًا لضمان سرعة اللعب دون اتصال، وتستبعد الفئات الدينية بالكامل.
 */

import { CITY_FACTS, HISTORY_FACTS, NATURE_FACTS, SPORT_FACTS } from "./generalFacts";

export type QuizDifficulty = "سهل" | "متوسط" | "صعب";

export type QuizQuestion = {
  id: string;
  category: string;
  difficulty: QuizDifficulty;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
};

const PER_CATEGORY = 2000;
const bank: QuizQuestion[] = [];

function difficulty(index: number): QuizDifficulty {
  if (index < 700) return "سهل";
  if (index < 1500) return "متوسط";
  return "صعب";
}

function rotate<T>(items: T[], amount: number): T[] {
  const offset = amount % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function numericOptions(answer: number, distractors: number[], seed: number): { options: [string, string, string, string]; correctIndex: number } {
  const values = [answer, ...distractors].filter((item, index, list) => list.indexOf(item) === index);
  let nudge = 2;
  while (values.length < 4) {
    const candidate = answer + nudge;
    if (!values.includes(candidate)) values.push(candidate);
    nudge += 2;
  }
  const rotated = rotate(values.slice(0, 4), seed % 4);
  return { options: rotated.map(String) as [string, string, string, string], correctIndex: rotated.indexOf(answer) };
}

function textOptions(answer: string, distractors: string[], seed: number): { options: [string, string, string, string]; correctIndex: number } {
  const values = [answer, ...distractors].filter((item, index, list) => list.indexOf(item) === index).slice(0, 4);
  const rotated = rotate(values, seed % 4);
  return { options: rotated as [string, string, string, string], correctIndex: rotated.indexOf(answer) };
}

function addQuestion(
  id: string,
  category: string,
  index: number,
  question: string,
  answer: number | string,
  distractors: (number | string)[],
) {
  const prepared = typeof answer === "number"
    ? numericOptions(answer, distractors as number[], index)
    : textOptions(answer, distractors as string[], index);
  bank.push({ id, category, difficulty: difficulty(index), question, options: prepared.options, correctIndex: prepared.correctIndex });
}

function buildAddition() {
  for (let index = 0; index < PER_CATEGORY; index += 1) {
    const first = 10 + Math.floor(index / 40);
    const second = 9 + (index % 40);
    const answer = first + second;
    addQuestion(`sum-${index + 1}`, "جمع سريع", index, `ما ناتج ${first} + ${second}؟`, answer, [answer + 1, answer - 1, answer + 10]);
  }
}

function buildSubtraction() {
  for (let index = 0; index < PER_CATEGORY; index += 1) {
    const second = 9 + (index % 40);
    const answer = 10 + Math.floor(index / 40);
    const first = second + answer;
    addQuestion(`sub-${index + 1}`, "طرح ذكي", index, `ما ناتج ${first} − ${second}؟`, answer, [answer + 1, answer - 1, answer + 10]);
  }
}

function buildMultiplication() {
  for (let index = 0; index < PER_CATEGORY; index += 1) {
    const first = 2 + (index % 48);
    const second = 2 + (Math.floor(index / 48) % 42);
    const answer = first * second;
    addQuestion(`mul-${index + 1}`, "ضرب", index, `ما ناتج ${first} × ${second}؟`, answer, [answer + first, answer - second, answer + second]);
  }
}

function buildDivision() {
  for (let index = 0; index < PER_CATEGORY; index += 1) {
    const divisor = 2 + (index % 41);
    const answer = 2 + (Math.floor(index / 41) % 49);
    const dividend = divisor * answer;
    addQuestion(`div-${index + 1}`, "قسمة", index, `ما ناتج ${dividend} ÷ ${divisor}؟`, answer, [answer + 1, Math.max(1, answer - 1), answer + divisor]);
  }
}

function buildPercentages() {
  const rates = [10, 20, 25, 50, 75];
  for (let index = 0; index < PER_CATEGORY; index += 1) {
    const rate = rates[index % rates.length];
    const base = 20 + Math.floor(index / rates.length) * 20;
    const answer = (base * rate) / 100;
    addQuestion(`pct-${index + 1}`, "نسب مئوية", index, `كم يساوي ${rate}% من ${base}؟`, answer, [answer + base / 20, answer - base / 20, answer + base / 10]);
  }
}

function buildFractions() {
  for (let index = 0; index < PER_CATEGORY; index += 1) {
    const denominator = 2 + (index % 18);
    const group = Math.floor(index / 18);
    const numerator = 1 + (group % (denominator - 1));
    const multiplier = 2 + (Math.floor(index / 306) % 7);
    const answer = `${numerator * multiplier}/${denominator * multiplier}`;
    addQuestion(
      `frac-${index + 1}`,
      "كسور",
      index,
      `أي كسر يكافئ ${numerator}/${denominator} عند ضرب البسط والمقام في ${multiplier}؟`,
      answer,
      [`${numerator * multiplier}/${denominator}`, `${numerator}/${denominator * multiplier}`, `${(numerator + 1) * multiplier}/${denominator * multiplier}`],
    );
  }
}

function buildSequences() {
  for (let index = 0; index < PER_CATEGORY; index += 1) {
    const start = 1 + Math.floor(index / 40);
    const step = 2 + (index % 40);
    const answer = start + step * 3;
    addQuestion(`seq-${index + 1}`, "متتاليات", index, `ما العدد التالي في المتتالية: ${start}، ${start + step}، ${start + step * 2}، ...؟`, answer, [answer + step, answer - step, start + step * 4]);
  }
}

function buildComparisons() {
  for (let index = 0; index < PER_CATEGORY; index += 1) {
    const base = 100 + Math.floor(index / 40) * 100;
    const jump = 2 + (index % 40);
    const answer = base + jump * 4;
    const options = [base + jump, base + jump * 2, base + jump * 3];
    addQuestion(`cmp-${index + 1}`, "مقارنات", index, "أي الأعداد التالية هو الأكبر؟", answer, options);
  }
}

function buildTime() {
  for (let index = 0; index < PER_CATEGORY; index += 1) {
    const minutes = index + 1;
    const answer = minutes * 60;
    addQuestion(`time-${index + 1}`, "زمن", index, `كم ثانية توجد في ${minutes} دقيقة؟`, answer, [answer + 60, Math.max(0, answer - 60), answer + 120]);
  }
}

function buildMeasurement() {
  for (let index = 0; index < PER_CATEGORY; index += 1) {
    const meters = index + 1;
    const answer = meters * 100;
    addQuestion(`measure-${index + 1}`, "قياس", index, `كم سنتيمترًا يساوي ${meters} متر؟`, answer, [answer + 100, Math.max(0, answer - 100), answer + 1000]);
  }
}

function distinctPool(values: readonly string[], answer: string, seed: number): string[] {
  const unique = Array.from(new Set(values.filter((item) => item !== answer)));
  const picks: string[] = [];
  let cursor = seed % unique.length;
  while (picks.length < 3 && unique.length > picks.length) {
    const value = unique[cursor % unique.length];
    if (!picks.includes(value)) picks.push(value);
    cursor += 127;
  }
  return picks;
}

function buildCitiesAndGeography() {
  const countries = CITY_FACTS.map((item) => item.countryLabel);
  const continents = CITY_FACTS.map((item) => item.continentLabel);
  CITY_FACTS.forEach((fact, index) => {
    const countryDistractors = distinctPool(countries, fact.countryLabel, index);
    const continentDistractors = distinctPool(continents, fact.continentLabel, index + 91);
    addQuestion(`city-country-a-${index + 1}`, "مدن ودول", index, `في أي دولة تقع مدينة ${fact.cityLabel}؟`, fact.countryLabel, countryDistractors);
    addQuestion(`city-country-b-${index + 1}`, "مدن ودول", index + 700, `مدينة ${fact.cityLabel} تتبع أي بلد؟`, fact.countryLabel, countryDistractors);
    addQuestion(`city-country-c-${index + 1}`, "مدن ودول", index + 1500, `عند ذكر مدينة ${fact.cityLabel}، نكون في أي دولة؟`, fact.countryLabel, countryDistractors);
    addQuestion(`city-continent-a-${index + 1}`, "جغرافيا وقارات", index, `في أي قارة تقع مدينة ${fact.cityLabel}؟`, fact.continentLabel, continentDistractors);
    addQuestion(`city-continent-b-${index + 1}`, "جغرافيا وقارات", index + 1100, `دولة ${fact.countryLabel} التي تتبع لها ${fact.cityLabel} تقع في أي قارة؟`, fact.continentLabel, continentDistractors);
  });
}

function buildSports() {
  const sports = SPORT_FACTS.map((item) => item.sportLabel);
  SPORT_FACTS.forEach((fact, index) => {
    const distractors = distinctPool(sports, fact.sportLabel, index + 23);
    addQuestion(`sport-a-${index + 1}`, "رياضة عالمية", index, `في أي رياضة اشتهر ${fact.personLabel}؟`, fact.sportLabel, distractors);
    addQuestion(`sport-b-${index + 1}`, "رياضة عالمية", index + 1200, `يرتبط اسم ${fact.personLabel} بأي رياضة؟`, fact.sportLabel, distractors);
  });
}

function buildNaturalFeatures() {
  const countries = NATURE_FACTS.map((item) => item.countryLabel);
  NATURE_FACTS.forEach((fact, index) => {
    const distractors = distinctPool(countries, fact.countryLabel, index + 401);
    addQuestion(`nature-a-${index + 1}`, "ظواهر ومعالم طبيعية", index, `في أي دولة يقع ${fact.featureLabel}؟`, fact.countryLabel, distractors);
    addQuestion(`nature-b-${index + 1}`, "ظواهر ومعالم طبيعية", index + 1200, `يرتبط ${fact.featureLabel} جغرافيًا بأي دولة؟`, fact.countryLabel, distractors);
  });
}

function buildHistory() {
  const countries = [...HISTORY_FACTS.map((item) => item.countryLabel), ...CITY_FACTS.map((item) => item.countryLabel)];
  const occupations = HISTORY_FACTS.map((item) => item.occupationLabel);
  HISTORY_FACTS.forEach((fact, index) => {
    addQuestion(`history-country-${index + 1}`, "تاريخ وشخصيات", index, `إلى أي دولة ينتمي ${fact.personLabel}؟`, fact.countryLabel, distinctPool(countries, fact.countryLabel, index + 903));
    addQuestion(`history-role-${index + 1}`, "تاريخ وشخصيات", index + 1100, `ما مجال ${fact.personLabel} التاريخي؟`, fact.occupationLabel, distinctPool(occupations, fact.occupationLabel, index + 307));
  });
}

buildAddition();
buildSubtraction();
buildMultiplication();
buildDivision();
buildPercentages();
buildFractions();
buildSequences();
buildComparisons();
buildTime();
buildMeasurement();
buildCitiesAndGeography();
buildSports();
buildNaturalFeatures();
buildHistory();

export const QUESTION_BANK: QuizQuestion[] = bank;
export const QUESTION_BANK_SIZE = QUESTION_BANK.length;
export const QUIZ_CATEGORIES = Array.from(new Set(QUESTION_BANK.map((question) => question.category)));

/** منطق لعبة الأسئلة: اختيار عشوائي بلا تكرار داخل الذاكرة المحفوظة، ونقاط لجلسات من عشر جولات. */

import { QUESTION_BANK, type QuizDifficulty, type QuizQuestion } from "./questionBank";

export type QuizProgress = {
  coins: number;
  totalPoints: number;
  totalCorrect: number;
  bestStreak: number;
  completedRounds: number;
  seenIds: string[];
  lastDailyReward: string | null;
};

const QUIZ_PROGRESS_KEY = "ehreb-quiz-progress-v1";

export const defaultQuizProgress: QuizProgress = {
  coins: 0,
  totalPoints: 0,
  totalCorrect: 0,
  bestStreak: 0,
  completedRounds: 0,
  seenIds: [],
  lastDailyReward: null,
};

export function loadQuizProgress(): QuizProgress {
  try {
    const raw = window.localStorage.getItem(QUIZ_PROGRESS_KEY);
    return raw ? { ...defaultQuizProgress, ...JSON.parse(raw) } : defaultQuizProgress;
  } catch {
    return defaultQuizProgress;
  }
}

export function saveQuizProgress(progress: QuizProgress) {
  window.localStorage.setItem(QUIZ_PROGRESS_KEY, JSON.stringify(progress));
}

export const REWARDED_AD_COINS = 25;
export type RewardedCoinResult = "rewarded" | "consent-unavailable" | "offline" | "no-fill" | "sdk-error" | "not-native";
export function applyRewardedCoinResult(coins: number, result: RewardedCoinResult) {
  return result === "rewarded" ? coins + REWARDED_AD_COINS : coins;
}

export function purchaseAid(coins: number, cost: number) {
  return coins >= cost ? coins - cost : null;
}

export async function collectCoinsFromRewardedAd(coins: number, watchAd: () => Promise<RewardedCoinResult>) {
  const result = await watchAd();
  return { result, coins: applyRewardedCoinResult(coins, result) };
}

export function pickQuestion(category: string, level: QuizDifficulty, seenIds: string[]): QuizQuestion {
  const matching = QUESTION_BANK.filter((question) => question.category === category && question.difficulty === level);
  const unseen = matching.filter((question) => !seenIds.includes(question.id));
  const pool = unseen.length ? unseen : matching;
  return pool[Math.floor(Math.random() * pool.length)];
}

function dateHash(dateKey: string) {
  return Array.from(dateKey).reduce((hash, letter) => ((hash * 31) + letter.charCodeAt(0)) >>> 0, 17);
}

export function getUtcDateKey() {
  return new Date().toISOString().slice(0, 10);
}

export function getDailyCategory(dateKey: string) {
  const categories = Array.from(new Set(QUESTION_BANK.map((question) => question.category)));
  return categories[dateHash(dateKey) % categories.length] ?? "معلومات عامة";
}

/** يعيد عشرة أسئلة ثابتة لليوم نفسه، من دون الاعتماد على عشوائية المتصفح. */
export function getDailyQuestions(dateKey: string, category: string, level: QuizDifficulty): QuizQuestion[] {
  const pool = QUESTION_BANK.filter((question) => question.category === category && question.difficulty === level).sort((a, b) => a.id.localeCompare(b.id));
  if (!pool.length) return [];
  const start = dateHash(`${dateKey}-${category}-${level}`) % pool.length;
  const step = Math.max(1, (dateHash(`${level}-${category}`) % 37) + 1);
  const result: QuizQuestion[] = [];
  const used = new Set<string>();
  let cursor = start;
  while (result.length < Math.min(10, pool.length)) {
    const candidate = pool[cursor % pool.length];
    if (!used.has(candidate.id)) {
      result.push(candidate);
      used.add(candidate.id);
    }
    cursor += step;
  }
  return result;
}

export function optionLetter(index: number) {
  return ["أ", "ب", "ج", "د"][index] ?? "—";
}

/** يستبعد التلميح إجابتين خاطئتين دائمًا ولا يلمس الإجابة الصحيحة. */
export function getHintEliminatedOptionIndexes(question: QuizQuestion): number[] {
  const seed = Array.from(question.id).reduce((total, character) => total + character.charCodeAt(0), 0);
  return question.options
    .map((_, index) => index)
    .filter((index) => index !== question.correctIndex)
    .sort((first, second) => ((first + seed) % 4) - ((second + seed) % 4))
    .slice(0, 2);
}

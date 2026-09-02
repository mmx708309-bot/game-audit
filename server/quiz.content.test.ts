import { describe, expect, it } from "vitest";
import { QUESTION_BANK, QUESTION_BANK_SIZE, QUIZ_CATEGORIES } from "../client/src/game/questionBank";
import { getDailyCategory, getDailyQuestions, getHintEliminatedOptionIndexes } from "../client/src/game/quizLogic";

describe("بنك أسئلة اللعبة", () => {
  it("يتجاوز خمسين ألف سؤال مع معرفات وإجابات سليمة", () => {
    expect(QUESTION_BANK_SIZE).toBeGreaterThanOrEqual(50_000);
    expect(new Set(QUESTION_BANK.map((question) => question.id)).size).toBe(QUESTION_BANK_SIZE);
    expect(QUESTION_BANK.every((question) => question.options.length === 4 && question.correctIndex >= 0 && question.correctIndex < 4 && new Set(question.options).size === 4)).toBe(true);
  });

  it("يتضمن فئات الحساب والدول والجغرافيا والرياضة والطبيعة والتاريخ", () => {
    ["مدن ودول", "جغرافيا وقارات", "رياضة عالمية", "ظواهر ومعالم طبيعية", "تاريخ وشخصيات", "جمع سريع"].forEach((category) => expect(QUIZ_CATEGORIES).toContain(category));
  });
});

describe("التحدي اليومي", () => {
  it("يعيد نفس عشرة أسئلة فريدة لليوم والفئة نفسيهما", () => {
    const dateKey = "2026-08-28";
    const category = getDailyCategory(dateKey);
    const first = getDailyQuestions(dateKey, category, "متوسط");
    const second = getDailyQuestions(dateKey, category, "متوسط");
    expect(first).toHaveLength(10);
    expect(first.map((question) => question.id)).toEqual(second.map((question) => question.id));
    expect(new Set(first.map((question) => question.id)).size).toBe(10);
  });
});

describe("تلميح إعلان المكافأة", () => {
  it("لا يحذف الإجابة الصحيحة عند استبعاد اختيارين", () => {
    const question = QUESTION_BANK[0];
    const removed = getHintEliminatedOptionIndexes(question);
    expect(removed).toHaveLength(2);
    expect(removed).not.toContain(question.correctIndex);
  });
});

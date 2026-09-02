import { QUESTION_BANK as bank, QUESTION_BANK_SIZE, QUIZ_CATEGORIES } from "../client/src/game/questionBank.ts";
const ids = new Set(bank.map((item) => item.id));
const invalid = bank.filter((item) => !item.question || item.options.length !== 4 || item.correctIndex < 0 || item.correctIndex > 3 || new Set(item.options).size !== 4);
const categoryCount = Object.fromEntries(Object.entries(Object.groupBy(bank, (item) => item.category)).map(([key, value]) => [key, value.length]));
const invalidByCategory = Object.fromEntries(Object.entries(Object.groupBy(invalid, (item) => item.category)).map(([key, value]) => [key, value.length]));

console.log(JSON.stringify({ count: bank.length, exportedCount: QUESTION_BANK_SIZE, uniqueIds: ids.size, invalid: invalid.length, invalidByCategory, invalidSamples: invalid.slice(0, 3), categories: categoryCount, categoryLabels: QUIZ_CATEGORIES }, null, 2));
if (bank.length < 50000 || QUESTION_BANK_SIZE !== bank.length || ids.size !== bank.length || invalid.length > 0) process.exit(1);

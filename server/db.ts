import { desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { dailyChallengeScores, type InsertUser, quizRounds, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: new Date() };
  (["name", "email", "loginMethod"] as const).forEach((field) => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function recordQuizRound(input: { userId: number; category: string; points: number; correctCount: number; questionCount: number }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا");
  await db.insert(quizRounds).values({ ...input, mode: "standard" });
}

export async function recordDailyScore(input: { userId: number; dateKey: string; points: number; correctCount: number }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا");
  await db.insert(dailyChallengeScores).values(input).onDuplicateKeyUpdate({
    set: {
      points: sql`GREATEST(${dailyChallengeScores.points}, VALUES(${dailyChallengeScores.points}))`,
      correctCount: sql`GREATEST(${dailyChallengeScores.correctCount}, VALUES(${dailyChallengeScores.correctCount}))`,
      updatedAt: new Date(),
    },
  });
}

export async function getLeaderboard(dateKey?: string) {
  const db = await getDb();
  if (!db) return [];
  if (dateKey) {
    return db.select({ name: users.name, points: dailyChallengeScores.points, correctCount: dailyChallengeScores.correctCount })
      .from(dailyChallengeScores)
      .innerJoin(users, eq(dailyChallengeScores.userId, users.id))
      .where(eq(dailyChallengeScores.dateKey, dateKey))
      .orderBy(desc(dailyChallengeScores.points), desc(dailyChallengeScores.correctCount))
      .limit(20);
  }
  const total = sql<number>`sum(${quizRounds.points})`;
  const totalCorrect = sql<number>`sum(${quizRounds.correctCount})`;
  return db.select({ name: users.name, points: total, correctCount: totalCorrect })
    .from(quizRounds)
    .innerJoin(users, eq(quizRounds.userId, users.id))
    .groupBy(users.id, users.name)
    .orderBy(desc(total), desc(totalCorrect))
    .limit(20);
}

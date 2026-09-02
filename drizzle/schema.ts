import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** كل جولة عادية أو يومية محفوظة لصاحب الحساب فقط. */
export const quizRounds = mysqlTable("quizRounds", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  mode: varchar("mode", { length: 20 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  points: int("points").notNull(),
  correctCount: int("correctCount").notNull(),
  questionCount: int("questionCount").notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
}, (table) => [index("quizRounds_user_completed_idx").on(table.userId, table.completedAt), index("quizRounds_mode_completed_idx").on(table.mode, table.completedAt)]);

/** يحفظ أفضل نتيجة يومية للمستخدم؛ المفتاح اليومي دائمًا بتوقيت UTC. */
export const dailyChallengeScores = mysqlTable("dailyChallengeScores", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  dateKey: varchar("dateKey", { length: 10 }).notNull(),
  points: int("points").notNull(),
  correctCount: int("correctCount").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("dailyChallenge_user_day_unique").on(table.userId, table.dateKey), index("dailyChallenge_day_points_idx").on(table.dateKey, table.points)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getLeaderboard, recordDailyScore, recordQuizRound } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const scoreInput = z.object({
  points: z.number().int().min(0).max(3_000),
  correctCount: z.number().int().min(0).max(10),
  questionCount: z.literal(10),
  category: z.string().trim().min(1).max(80),
});

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  quiz: router({
    leaderboard: publicProcedure.input(z.object({ dateKey: dateKeySchema.optional() }).optional()).query(async ({ input }) => getLeaderboard(input?.dateKey)),
    saveRound: protectedProcedure.input(scoreInput).mutation(async ({ ctx, input }) => {
      await recordQuizRound({ userId: ctx.user.id, ...input });
      return { success: true } as const;
    }),
    saveDaily: protectedProcedure.input(scoreInput.extend({ dateKey: dateKeySchema })).mutation(async ({ ctx, input }) => {
      await recordDailyScore({ userId: ctx.user.id, dateKey: input.dateKey, points: input.points, correctCount: input.correctCount });
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;

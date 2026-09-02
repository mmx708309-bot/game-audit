import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyRewardedCoinResult, collectCoinsFromRewardedAd, purchaseAid } from "../client/src/game/quizLogic";

const logicSource = readFileSync("client/src/game/quizLogic.ts", "utf8");
const gameSource = readFileSync("client/src/components/GameShell.tsx", "utf8");
const admobSource = readFileSync("client/src/mobile/admob.ts", "utf8");

describe("اقتصاد العملات والمساعدات", () => {
  it("does not grant coins from answers or the daily round", () => {
    expect(logicSource).toContain("coins: 0");
    expect(gameSource).toContain("totalPoints: current.totalPoints + earned");
    expect(gameSource).toContain("coins: current.coins + (index === -1 ? 0 : 1)");
    expect(gameSource).not.toContain("lastDailyReward: awardDailyBonus ? today : current.lastDailyReward, coins:");
  });

  it("grants coins only after a completed rewarded ad", async () => {
    expect(gameSource).toContain("watchRewardedForCoins");
    expect(gameSource).toContain('if (result === "rewarded")');
    expect(gameSource).toContain("collectCoinsFromRewardedAd(progress.coins");
    expect(admobSource).toContain("return requestRewardedHint();");
    const rewardedWatch = async () => "rewarded" as const;
    await expect(collectCoinsFromRewardedAd(10, rewardedWatch)).resolves.toEqual({ result: "rewarded", coins: 35 });
  });

  it("does not grant coins for an incomplete, failed, or unavailable ad", async () => {
    const failedWatch = async () => "no-fill" as const;
    const closedWatch = async () => "sdk-error" as const;
    await expect(collectCoinsFromRewardedAd(10, failedWatch)).resolves.toEqual({ result: "no-fill", coins: 10 });
    await expect(collectCoinsFromRewardedAd(10, closedWatch)).resolves.toEqual({ result: "sdk-error", coins: 10 });
    expect(applyRewardedCoinResult(10, "no-fill")).toBe(10);
    expect(applyRewardedCoinResult(10, "sdk-error")).toBe(10);
    expect(applyRewardedCoinResult(10, "consent-unavailable")).toBe(10);
    expect(applyRewardedCoinResult(10, "not-native")).toBe(10);
  });

  it("limits coins to hint purchases and never offers ad-free days", () => {
    expect(gameSource).toContain("purchaseAid(current.coins, 60)");
    expect(gameSource).toContain("purchaseAid(current.coins, 40)");
    expect(purchaseAid(50, 60)).toBeNull();
    expect(purchaseAid(60, 60)).toBe(0);
    expect(purchaseAid(100, 40)).toBe(60);
    expect(gameSource).toContain("شاهد فيديو واكسب 25 عملة");
    expect(gameSource).not.toContain("شراء أيام");
    expect(gameSource).not.toContain("إزالة الإعلانات");
  });
});


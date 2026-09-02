import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Unity Ads build mode configuration", () => {
  it("enables Test Mode only for debug and disables it for release", () => {
    const gradle = readFileSync(resolve(process.cwd(), "android/app/build.gradle"), "utf8");
    const plugin = readFileSync(resolve(process.cwd(), "android/app/src/main/java/com/tahaddi/quiz50k/UnityAdsPlugin.java"), "utf8");
    expect(gradle).toContain('buildConfigField "boolean", "UNITY_ADS_TEST_MODE", "true"');
    expect(gradle).toContain('buildConfigField "boolean", "UNITY_ADS_TEST_MODE", "false"');
    expect(plugin).toContain("BuildConfig.UNITY_ADS_TEST_MODE");
    expect(plugin).not.toMatch(/GAME_ID,\s*true,/);
  });
});

describe("Release signing configuration", () => {
  it("has both Android signing passwords available", () => {
    expect(process.env.ANDROID_RELEASE_KEYSTORE_PASSWORD?.length).toBeGreaterThan(0);
    expect(process.env.ANDROID_RELEASE_KEY_PASSWORD?.length).toBeGreaterThan(0);
  });
});

describe("Store support configuration", () => {
  it("has a valid public support email", () => {
    expect(process.env.APP_SUPPORT_EMAIL).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
  });
});

describe("Application branding configuration", () => {
  it("uses the requested public app title", () => {
    expect(process.env.VITE_APP_TITLE).toBe("فكّر بسرعة");
  });
});

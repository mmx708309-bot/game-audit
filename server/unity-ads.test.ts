import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getRewardedHintMessage } from "../client/src/mobile/adMessages";

const pluginSource = readFileSync("android/app/src/main/java/com/tahaddi/quiz50k/UnityAdsPlugin.java", "utf8");
const gradleSource = readFileSync("android/app/build.gradle", "utf8");
const admobSource = readFileSync("client/src/mobile/admob.ts", "utf8");
const privacySource = readFileSync("client/public/privacy.html", "utf8");
const gameShellSource = readFileSync("client/src/components/GameShell.tsx", "utf8");

describe("Unity Ads Android integration", () => {
  it("uses the active Android Game ID and placement IDs", () => {
    expect(pluginSource).toContain('GAME_ID = "800364136"');
    expect(pluginSource).toContain('GAME_ID,\n                    BuildConfig.UNITY_ADS_TEST_MODE,');
    expect(pluginSource).toContain('BANNER_PLACEMENT = "Banner_Android"');
    expect(pluginSource).toContain('INTERSTITIAL_PLACEMENT = "Interstitial_Android"');
    expect(pluginSource).toContain('REWARDED_PLACEMENT = "Rewarded_Android"');
    expect(gradleSource).toContain('buildConfigField "boolean", "UNITY_ADS_TEST_MODE", "true"');
    expect(gradleSource).toContain('buildConfigField "boolean", "UNITY_ADS_TEST_MODE", "false"');
  });

  it("keeps the Unity Ads Gradle dependency and Advertising ID permission", () => {
    expect(gradleSource).toContain("com.unity3d.ads:unity-ads:4.7.0");
    expect(readFileSync("android/app/src/main/AndroidManifest.xml", "utf8")).toContain(
      "com.google.android.gms.permission.AD_ID",
    );
  });

  it("keeps AdMob primary and Unity Ads as an Android fallback", () => {
    expect(admobSource).toContain("AdMob.showBanner");
    expect(admobSource).toContain("adSize: BannerAdSize.BANNER");
    expect(admobSource).toContain("showUnityResultBanner");
    expect(admobSource).toContain("requestUnityRewardedHint");
    expect(admobSource).toContain("preloadRewardedAd");
    expect(admobSource).toContain("void preloadRewardedAd();");
    expect(admobSource).toContain("فشل بانر AdMob، ستتم تجربة Unity Ads");
    expect(privacySource).toContain("Google AdMob وUnity Ads");
  });

  it("uses official AdMob test units only when test mode is enabled", () => {
    expect(admobSource).toContain('import.meta.env.VITE_ADMOB_TEST_MODE === "true"');
    expect(admobSource).toContain("ca-app-pub-3940256099942544/9214589741");
    expect(admobSource).toContain("ca-app-pub-3940256099942544/5224354917");
    expect(admobSource).toContain("ca-app-pub-5675767725733870/9902486260");
    expect(admobSource).toContain("ca-app-pub-5675767725733870/4071575086");
  });

  it("does not use Unity fallback when ad consent is unavailable", () => {
    expect(admobSource).toContain('if (!consent.canRequestAds) return "consent-unavailable";');
    expect(admobSource).toContain('if (readiness !== "ready") return readiness;');
    expect(admobSource.indexOf("const unityResult = await requestUnityRewardedHint();")).toBeGreaterThan(
      admobSource.indexOf('if (readiness !== "ready") return readiness;'),
    );
    expect(admobSource).toContain("if (readiness !== \"ready\") return readiness;");
  });

  it("maps ad failure reasons to distinct Arabic UI messages", () => {
    expect(getRewardedHintMessage("consent-unavailable")).toContain("موافقة الإعلانات غير متاحة");
    expect(getRewardedHintMessage("offline")).toContain("لا يوجد اتصال بالإنترنت");
    expect(getRewardedHintMessage("no-fill")).toContain("لا يوجد إعلان متاح الآن من الشبكة");
    expect(getRewardedHintMessage("sdk-error")).toContain("حدث خطأ مؤقت في خدمة الإعلانات");
    expect(gameShellSource).toContain("hintMessage && <small>{hintMessage}</small>");
  });

  it("grants the Unity reward only for a completed show", () => {
    expect(pluginSource).toContain(
      "state == UnityAds.UnityAdsShowCompletionState.COMPLETED",
    );
    expect(pluginSource).toContain(
      "state == UnityAds.UnityAdsShowCompletionState.COMPLETED ? result(true) : failure",
    );
    const rewardedStart = pluginSource.indexOf("private void showRewardedInternal");
    const interstitialStart = pluginSource.indexOf("@PluginMethod\n    public void showInterstitial");
    const rewardedSection = pluginSource.slice(rewardedStart, interstitialStart);
    expect(rewardedSection).not.toContain("call.resolve(result(true));");
  });
});

  it("distinguishes AdMob banner failure from Unity fallback failure", () => {
    expect(admobSource).toContain('provider: "AdMob"');
    expect(admobSource).toContain('provider: "Unity Ads"');
    expect(admobSource).toContain("fallback-failed");
    expect(gameShellSource).toContain("مصدر فشل البانر");
  });

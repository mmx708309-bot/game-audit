import { AdMob, AdmobConsentStatus, BannerAdPosition, BannerAdSize } from "@capacitor-community/admob";
import { Capacitor } from "@capacitor/core";
import { hideUnityResultBanner, initializeUnityAds, requestUnityRewardedHint, showUnityResultBanner } from "./unityAds";

const USE_ADMOB_TEST_ADS = import.meta.env.VITE_ADMOB_TEST_MODE === "true";
const BANNER_AD_UNIT_ID = USE_ADMOB_TEST_ADS
  ? "ca-app-pub-3940256099942544/9214589741"
  : "ca-app-pub-5675767725733870/9902486260";
const REWARDED_AD_UNIT_ID = USE_ADMOB_TEST_ADS
  ? "ca-app-pub-3940256099942544/5224354917"
  : "ca-app-pub-5675767725733870/4071575086";
let adMobReady = false;
let preparedRewardedAdUnitId: string | null = null;
let rewardedLoadPromise: Promise<"ready" | RewardedHintFailure> | null = null;

export type RewardedHintFailure = "consent-unavailable" | "offline" | "no-fill" | "sdk-error";
export type RewardedHintResult = "rewarded" | RewardedHintFailure | "not-native";
export type RewardedDiagnostic = { provider: "AdMob" | "Unity Ads"; code: string };
let lastRewardedDiagnostic: RewardedDiagnostic | null = null;
export function getLastRewardedDiagnostic() { return lastRewardedDiagnostic; }
export type BannerDiagnostic = { provider: "AdMob" | "Unity Ads"; code: string; message: string };
let lastBannerDiagnostic: BannerDiagnostic | null = null;
export function getLastBannerDiagnostic() { return lastBannerDiagnostic; }
type AdRequestReadiness = "ready" | RewardedHintFailure | "not-native";

function classifyAdFailure(error: unknown): RewardedHintFailure {
  const message = String(error instanceof Error ? error.message : error).toLowerCase();
  if ((typeof navigator !== "undefined" && navigator.onLine === false) || /offline|network|timeout|connection|internet/.test(message)) return "offline";
  if (/no.?fill|no ad|not available|inventory/.test(message)) return "no-fill";
  return "sdk-error";
}

async function preloadRewardedAd(): Promise<"ready" | RewardedHintFailure> {
  if (preparedRewardedAdUnitId) return "ready";
  if (rewardedLoadPromise) return rewardedLoadPromise;
  rewardedLoadPromise = (async () => {
    const delays = [0, 800, 1500];
    for (let attempt = 0; attempt < delays.length; attempt += 1) {
      const delayMs = delays[attempt];
      if (delayMs) await new Promise((resolve) => globalThis.setTimeout(resolve, delayMs));
      try {
        const prepared = await AdMob.prepareRewardVideoAd({ adId: REWARDED_AD_UNIT_ID });
        preparedRewardedAdUnitId = prepared.adUnitId;
        return "ready";
      } catch (error) {
        console.warn(`محاولة تجهيز الإعلان المكافأ رقم ${attempt + 1} لم تنجح`, error);
        if (attempt === 2) return classifyAdFailure(error);
      }
    }
    return "sdk-error";
  })().finally(() => {
    rewardedLoadPromise = null;
  });
  return rewardedLoadPromise;
}

async function prepareAdMob(): Promise<AdRequestReadiness> {
  if (!Capacitor.isNativePlatform()) return "not-native";
  if (adMobReady) return "ready";
  try {
    await AdMob.initialize();
    let consent = await AdMob.requestConsentInfo();
    if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) {
      consent = await AdMob.showConsentForm();
    }
    if (!consent.canRequestAds) return "consent-unavailable";
    adMobReady = true;
    await initializeUnityAds();
    void preloadRewardedAd();
    return "ready";
  } catch (error) {
    console.warn("تعذر تجهيز موافقة الإعلانات", error);
    return classifyAdFailure(error);
  }
}

/** الإعلان الأصلي يظهر في النتيجة فقط؛ لا يظهر إطلاقًا داخل شاشة السؤال. */
export async function showResultBanner() {
  const readiness = await prepareAdMob();
  if (readiness !== "ready") return readiness;
  try {
    await AdMob.showBanner({
      adId: BANNER_AD_UNIT_ID,
      adSize: BannerAdSize.BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
    });
    lastBannerDiagnostic = null;
    return "ready" as const;
  } catch (error) {
    lastBannerDiagnostic = { provider: "AdMob", code: "banner-show-failed", message: error instanceof Error ? error.message : String(error) };
    console.warn("فشل بانر AdMob، ستتم تجربة Unity Ads", error);
    if (await showUnityResultBanner()) {
      lastBannerDiagnostic = null;
      return "ready" as const;
    }
    lastBannerDiagnostic = { provider: "Unity Ads", code: "fallback-failed", message: "Unity Ads banner fallback did not load" };
    return classifyAdFailure(error);
  }
}

export async function hideResultBanner() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await AdMob.hideBanner();
  } catch {
    // لا توجد وحدة بانر AdMob ظاهرة حاليًا.
  }
  await hideUnityResultBanner();
}

/** يعيد المكافأة فقط بعد أن يؤكد المكوّن الأصلي اكتمال مشاهدة الإعلان. */
export async function watchRewardedForCoins(): Promise<RewardedHintResult> {
  return requestRewardedHint();
}

export async function requestRewardedHint(): Promise<RewardedHintResult> {
  if (!Capacitor.isNativePlatform()) return "not-native";
  const readiness = await prepareAdMob();
  if (readiness === "not-native") return "not-native";
  if (readiness !== "ready") {
    lastRewardedDiagnostic = { provider: "AdMob", code: readiness };
    return readiness;
  }

  const loaded = await preloadRewardedAd();
  if (loaded !== "ready") {
    const unityResult = await requestUnityRewardedHint();
    if (unityResult === "rewarded") { lastRewardedDiagnostic = null; return "rewarded"; }
    lastRewardedDiagnostic = { provider: "Unity Ads", code: unityResult };
    return loaded;
  }
  if (!preparedRewardedAdUnitId) {
    const unityResult = await requestUnityRewardedHint();
    return unityResult === "rewarded" ? "rewarded" : "sdk-error";
  }

  const adUnitId = preparedRewardedAdUnitId;
  preparedRewardedAdUnitId = null;
  try {
    await AdMob.showRewardVideoAd({ adId: adUnitId });
    lastRewardedDiagnostic = null;
    void preloadRewardedAd();
    return "rewarded";
  } catch (error) {
    console.warn("لم يتم عرض إعلان مكافأة التلميح من AdMob، ستتم تجربة Unity Ads", error);
    void preloadRewardedAd();
    const unityResult = await requestUnityRewardedHint();
    if (unityResult === "rewarded") { lastRewardedDiagnostic = null; return "rewarded"; }
    lastRewardedDiagnostic = { provider: "Unity Ads", code: unityResult };
    return classifyAdFailure(error);
  }
}

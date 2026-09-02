import { registerPlugin } from "@capacitor/core";

interface UnityAdsResult {
  completed: boolean;
  code?: string;
  message?: string;
}

interface UnityAdsPlugin {
  initialize(): Promise<UnityAdsResult>;
  showRewarded(): Promise<UnityAdsResult>;
  showInterstitial(): Promise<UnityAdsResult>;
  showBanner(): Promise<UnityAdsResult>;
  hideBanner(): Promise<UnityAdsResult>;
}

const UnityAds = registerPlugin<UnityAdsPlugin>("UnityAds");

export async function initializeUnityAds(): Promise<boolean> {
  try {
    const result = await UnityAds.initialize();
    return result.completed;
  } catch (error) {
    console.warn("لم تتم تهيئة Unity Ads", error);
    return false;
  }
}

type UnityRewardedFailure = "consent-unavailable" | "offline" | "no-fill" | "sdk-error";

function classifyUnityFailure(result?: UnityAdsResult, error?: unknown): UnityRewardedFailure {
  const message = `${result?.code ?? ""} ${result?.message ?? ""} ${error instanceof Error ? error.message : error ?? ""}`.toLowerCase();
  if (/offline|network|timeout|connection|internet/.test(message)) return "offline";
  if (/no.?fill|no ad|not available|inventory/.test(message)) return "no-fill";
  return "sdk-error";
}

export async function requestUnityRewardedHint(): Promise<"rewarded" | UnityRewardedFailure | "not-native"> {
  try {
    if (!(await initializeUnityAds())) return "sdk-error";
    const result = await UnityAds.showRewarded();
    return result.completed ? "rewarded" : classifyUnityFailure(result);
  } catch (error) {
    console.warn("لم يتم تحميل إعلان Unity المكافأ", error);
    return classifyUnityFailure(undefined, error);
  }
}

export async function showUnityInterstitial(): Promise<boolean> {
  try {
    if (!(await initializeUnityAds())) return false;
    const result = await UnityAds.showInterstitial();
    return result.completed;
  } catch (error) {
    console.warn("لم يتم تحميل إعلان Unity البيني", error);
    return false;
  }
}

export async function showUnityResultBanner(): Promise<boolean> {
  try {
    if (!(await initializeUnityAds())) return false;
    const result = await UnityAds.showBanner();
    if (!result.completed) console.warn("فشل بانر Unity Ads", result.code ?? "unknown", result.message ?? "no message");
    return result.completed;
  } catch (error) {
    console.warn("فشل تهيئة أو عرض بانر Unity Ads", error);
    return false;
  }
}

export async function hideUnityResultBanner(): Promise<void> {
  try {
    await UnityAds.hideBanner();
  } catch {
    // لا يوجد بانر Unity ظاهر حاليًا.
  }
}

import { beforeEach, describe, expect, it, vi } from "vitest";

const { adMob, unityAds } = vi.hoisted(() => ({
  adMob: {
    initialize: vi.fn(),
    requestConsentInfo: vi.fn(),
    showConsentForm: vi.fn(),
    prepareRewardVideoAd: vi.fn(),
    showRewardVideoAd: vi.fn(),
    showBanner: vi.fn(),
    hideBanner: vi.fn(),
  },
  unityAds: {
    initializeUnityAds: vi.fn(),
    requestUnityRewardedHint: vi.fn(),
    showUnityResultBanner: vi.fn(),
    hideUnityResultBanner: vi.fn(),
  },
}));

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock("@capacitor-community/admob", () => ({
  AdMob: adMob,
  AdmobConsentStatus: { REQUIRED: "required" },
  BannerAdPosition: { BOTTOM_CENTER: "bottom-center" },
  BannerAdSize: { BANNER: "banner", ADAPTIVE_BANNER: "adaptive" },
}));
vi.mock("../client/src/mobile/unityAds", () => unityAds);

async function loadModule() {
  vi.resetModules();
  return import("../client/src/mobile/admob");
}

beforeEach(() => {
  vi.clearAllMocks();
  adMob.initialize.mockResolvedValue(undefined);
  adMob.requestConsentInfo.mockResolvedValue({ isConsentFormAvailable: false, canRequestAds: true });
  adMob.prepareRewardVideoAd.mockResolvedValue({ adUnitId: "admob-rewarded" });
  adMob.showRewardVideoAd.mockResolvedValue(undefined);
  unityAds.initializeUnityAds.mockResolvedValue(true);
  unityAds.requestUnityRewardedHint.mockResolvedValue("unavailable");
  unityAds.showUnityResultBanner.mockResolvedValue(false);
});

describe("showResultBanner behavior", () => {
  it("shows the official AdMob banner with the configured unit, size, and position", async () => {
    adMob.showBanner.mockResolvedValue(undefined);
    const { showResultBanner } = await loadModule();

    await expect(showResultBanner()).resolves.toBe("ready");
    expect(adMob.showBanner).toHaveBeenCalledWith({
      adId: "ca-app-pub-5675767725733870/9902486260",
      adSize: "banner",
      position: "bottom-center",
      margin: 0,
    });
    expect(unityAds.showUnityResultBanner).not.toHaveBeenCalled();
  });

  it("uses Unity Banner fallback only after AdMob Banner fails", async () => {
    adMob.showBanner.mockRejectedValue(new Error("no fill"));
    unityAds.showUnityResultBanner.mockResolvedValue(true);
    const { showResultBanner } = await loadModule();

    await expect(showResultBanner()).resolves.toBe("ready");
    expect(unityAds.showUnityResultBanner).toHaveBeenCalledTimes(1);
  });

  it("returns a classified failure when both banner providers fail", async () => {
    adMob.showBanner.mockRejectedValue(new Error("no fill"));
    unityAds.showUnityResultBanner.mockResolvedValue(false);
    const { showResultBanner } = await loadModule();

    await expect(showResultBanner()).resolves.toBe("no-fill");
  });
});

describe("requestRewardedHint behavior", () => {
  it("returns rewarded only after AdMob loads and shows the ad", async () => {
    const { requestRewardedHint } = await loadModule();

    await expect(requestRewardedHint()).resolves.toBe("rewarded");
    expect(adMob.prepareRewardVideoAd).toHaveBeenCalledWith({ adId: "ca-app-pub-5675767725733870/4071575086" });
    expect(adMob.showRewardVideoAd).toHaveBeenCalledWith({ adId: "admob-rewarded" });
  });

  it("returns consent-unavailable and skips Unity when consent is denied", async () => {
    adMob.requestConsentInfo.mockResolvedValue({ isConsentFormAvailable: false, canRequestAds: false });
    const { requestRewardedHint } = await loadModule();

    await expect(requestRewardedHint()).resolves.toBe("consent-unavailable");
    expect(unityAds.requestUnityRewardedHint).not.toHaveBeenCalled();
    expect(adMob.prepareRewardVideoAd).not.toHaveBeenCalled();
  });

  it("classifies a disconnected device as offline", async () => {
    const originalOnline = globalThis.navigator?.onLine;
    if (globalThis.navigator) Object.defineProperty(globalThis.navigator, "onLine", { configurable: true, value: false });
    adMob.prepareRewardVideoAd.mockRejectedValue(new Error("no fill"));
    const { requestRewardedHint } = await loadModule();

    await expect(requestRewardedHint()).resolves.toBe("offline");
    if (globalThis.navigator) Object.defineProperty(globalThis.navigator, "onLine", { configurable: true, value: originalOnline });
  });

  it("does not reward when loading fails", async () => {
    adMob.prepareRewardVideoAd.mockRejectedValue(new Error("no fill"));
    const { requestRewardedHint } = await loadModule();

    await expect(requestRewardedHint()).resolves.toBe("no-fill");
    expect(adMob.showRewardVideoAd).not.toHaveBeenCalled();
  });

  it("does not reward when showing fails", async () => {
    adMob.showRewardVideoAd.mockRejectedValueOnce(new Error("show failed"));
    const { requestRewardedHint } = await loadModule();

    await expect(requestRewardedHint()).resolves.toBe("sdk-error");
    expect(unityAds.requestUnityRewardedHint).toHaveBeenCalled();
  });
});

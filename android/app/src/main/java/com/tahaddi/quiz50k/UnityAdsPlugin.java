package com.tahaddi.quiz50k;

import android.app.Activity;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.unity3d.ads.IUnityAdsInitializationListener;
import com.unity3d.ads.IUnityAdsLoadListener;
import com.unity3d.ads.IUnityAdsShowListener;
import com.unity3d.ads.UnityAds;
import com.unity3d.ads.UnityAdsShowOptions;
import com.unity3d.services.banners.BannerErrorInfo;
import com.unity3d.services.banners.BannerView;
import com.unity3d.services.banners.UnityBannerSize;

@CapacitorPlugin(name = "UnityAds")
public class UnityAdsPlugin extends Plugin {
    private static final String GAME_ID = "800364136";
    private static final String BANNER_PLACEMENT = "Banner_Android";
    private static final String INTERSTITIAL_PLACEMENT = "Interstitial_Android";
    private static final String REWARDED_PLACEMENT = "Rewarded_Android";

    private boolean initialized = false;
    private boolean initializationFailed = false;
    private BannerView bannerView;
    private PluginCall pendingRewardedCall;

    private final IUnityAdsInitializationListener initializationListener = new IUnityAdsInitializationListener() {
        @Override
        public void onInitializationComplete() {
            initialized = true;
            initializationFailed = false;
            if (pendingRewardedCall != null) {
                PluginCall call = pendingRewardedCall;
                pendingRewardedCall = null;
                showRewardedInternal(call);
            }
        }

        @Override
        public void onInitializationFailed(UnityAds.UnityAdsInitializationError error, String message) {
            initialized = false;
            initializationFailed = true;
            if (pendingRewardedCall != null) {
                PluginCall call = pendingRewardedCall;
                pendingRewardedCall = null;
                call.resolve(failure("unity", error.name(), message));
            }
        }
    };

    @Override
    public void load() {
        super.load();
    }

    @PluginMethod
    public void initialize(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (initialized) {
                call.resolve(result(true));
                return;
            }
            UnityAds.initialize(
                    getActivity().getApplicationContext(),
                    GAME_ID,
                    BuildConfig.UNITY_ADS_TEST_MODE,
                    new IUnityAdsInitializationListener() {
                        @Override public void onInitializationComplete() { initialized = true; initializationFailed = false; call.resolve(result(true)); }
                        @Override public void onInitializationFailed(UnityAds.UnityAdsInitializationError error, String message) { initializationFailed = true; call.resolve(failure("unity", error.name(), message)); }
                    }
            );
        });
    }

    @PluginMethod
    public void showRewarded(PluginCall call) {
        if (initializationFailed) {
            call.resolve(failure("unity", "initialization-failed", "Unity Ads initialization failed before showing the ad"));
            return;
        }
        if (!initialized) {
            pendingRewardedCall = call;
            return;
        }
        showRewardedInternal(call);
    }

    private void showRewardedInternal(PluginCall call) {
        getActivity().runOnUiThread(() -> UnityAds.load(REWARDED_PLACEMENT, new IUnityAdsLoadListener() {
            @Override
            public void onUnityAdsAdLoaded(String placementId) {
                UnityAds.show(getActivity(), REWARDED_PLACEMENT, new UnityAdsShowOptions(), new IUnityAdsShowListener() {
                    @Override public void onUnityAdsShowFailure(String placementId, UnityAds.UnityAdsShowError error, String message) { call.resolve(failure("unity", error.name(), message)); }
                    @Override public void onUnityAdsShowStart(String placementId) { }
                    @Override public void onUnityAdsShowClick(String placementId) { }
                    @Override public void onUnityAdsShowComplete(String placementId, UnityAds.UnityAdsShowCompletionState state) {
                        call.resolve(state == UnityAds.UnityAdsShowCompletionState.COMPLETED ? result(true) : failure("unity", state.name(), "The rewarded ad was not completed"));
                    }
                });
            }

            @Override
            public void onUnityAdsFailedToLoad(String placementId, UnityAds.UnityAdsLoadError error, String message) {
                call.resolve(failure("unity", error.name(), message));
            }
        }));
    }

    @PluginMethod
    public void showInterstitial(PluginCall call) {
        if (!initialized) {
            call.resolve(failure("unity", "not-initialized", "Unity Ads is not initialized"));
            return;
        }
        getActivity().runOnUiThread(() -> UnityAds.load(INTERSTITIAL_PLACEMENT, new IUnityAdsLoadListener() {
            @Override
            public void onUnityAdsAdLoaded(String placementId) {
                UnityAds.show(getActivity(), INTERSTITIAL_PLACEMENT, new UnityAdsShowOptions(), new IUnityAdsShowListener() {
                    @Override public void onUnityAdsShowFailure(String placementId, UnityAds.UnityAdsShowError error, String message) { call.resolve(failure("unity", error.name(), message)); }
                    @Override public void onUnityAdsShowStart(String placementId) { }
                    @Override public void onUnityAdsShowClick(String placementId) { }
                    @Override public void onUnityAdsShowComplete(String placementId, UnityAds.UnityAdsShowCompletionState state) { call.resolve(result(true)); }
                });
            }
            @Override public void onUnityAdsFailedToLoad(String placementId, UnityAds.UnityAdsLoadError error, String message) { call.resolve(failure("unity", error.name(), message)); }
        }));
    }

    @PluginMethod
    public void showBanner(PluginCall call) {
        if (!initialized) {
            call.resolve(failure("unity", "not-initialized", "Unity Ads is not initialized"));
            return;
        }
        getActivity().runOnUiThread(() -> {
            if (bannerView != null) {
                hideBannerView();
            }
            Activity activity = getActivity();
            bannerView = new BannerView(activity, BANNER_PLACEMENT, new UnityBannerSize(320, 50));
            bannerView.setListener(new BannerView.IListener() {
                @Override public void onBannerLoaded(BannerView view) { call.resolve(result(true)); }
                @Override public void onBannerFailedToLoad(BannerView view, BannerErrorInfo errorInfo) { call.resolve(failure("unity", "banner-load-failed", String.valueOf(errorInfo))); }
                @Override public void onBannerClick(BannerView view) { }
                @Override public void onBannerLeftApplication(BannerView view) { }
            });
            bannerView.load();
            FrameLayout root = activity.findViewById(android.R.id.content);
            FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
            );
            params.gravity = Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;
            root.addView(bannerView, params);
        });
    }

    @PluginMethod
    public void hideBanner(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            hideBannerView();
            call.resolve(result(true));
        });
    }

    private void hideBannerView() {
        if (bannerView != null) {
            ViewGroup parent = (ViewGroup) bannerView.getParent();
            if (parent != null) parent.removeView(bannerView);
            bannerView = null;
        }
    }

    private JSObject result(boolean success) {
        JSObject response = new JSObject();
        response.put("completed", success);
        response.put("provider", "unity");
        return response;
    }

    private JSObject failure(String provider, String code, String message) {
        JSObject response = new JSObject();
        response.put("completed", false);
        response.put("provider", provider);
        response.put("code", code == null ? "unknown" : code);
        response.put("message", message == null ? "unknown" : message);
        return response;
    }
}

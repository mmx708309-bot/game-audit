package com.tahaddi.quiz50k;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(UnityAdsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

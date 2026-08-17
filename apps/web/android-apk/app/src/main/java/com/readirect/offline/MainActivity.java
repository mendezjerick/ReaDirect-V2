package com.readirect.offline;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.readirect.offline.asr.OfflineAsrPlugin;
import com.readirect.offline.learner.OfflineLearnerStorePlugin;
import com.readirect.offline.tts.OfflineTtsPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(OfflineAsrPlugin.class);
        registerPlugin(OfflineLearnerStorePlugin.class);
        registerPlugin(OfflineTtsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

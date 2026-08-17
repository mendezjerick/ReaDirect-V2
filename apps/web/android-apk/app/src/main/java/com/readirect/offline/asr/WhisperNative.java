package com.readirect.offline.asr;

import android.content.res.AssetManager;

final class WhisperNative {
    static {
        System.loadLibrary("readirect_whisper");
    }

    private WhisperNative() {}

    static native long initContextFromAsset(AssetManager assetManager, String assetPath);

    static native void freeContext(long contextPointer);

    static native String transcribe(long contextPointer, int threads, float[] audioSamples);

    static native String getSystemInfo();
}

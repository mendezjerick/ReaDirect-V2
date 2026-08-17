package com.readirect.offline.asr;

import android.Manifest;
import android.app.ActivityManager;
import android.content.Context;
import android.os.Build;
import android.os.PowerManager;
import android.os.SystemClock;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(
    name = "OfflineAsr",
    permissions = {
        @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO })
    }
)
public final class OfflineAsrPlugin extends Plugin {
    private static final Set<String> SUPPORTED_TIERS = Set.of("low", "medium", "high");
    private static final int DEFAULT_MAX_RECORDING_MILLIS = 30000;
    private static final int MAX_RECORDING_MILLIS = 60000;
    private static final int MIN_MAX_RECORDING_MILLIS = 1000;

    private final Object stateLock = new Object();
    private final ExecutorService inferenceExecutor = Executors.newSingleThreadExecutor(runnable -> {
        Thread thread = new Thread(runnable, "readirect-offline-asr");
        thread.setDaemon(true);
        return thread;
    });

    private volatile long contextPointer;
    private volatile String activeTier;
    private volatile int inferenceThreads = 1;
    private PcmAudioRecorder recorder;
    private boolean initializing;
    private boolean processing;
    private boolean destroyed;

    @PluginMethod
    public void getDeviceCapabilities(PluginCall call) {
        ActivityManager manager =
            (ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE);
        if (manager == null) {
            call.reject("Android device capabilities are unavailable.", "CAPABILITIES_UNAVAILABLE");
            return;
        }

        ActivityManager.MemoryInfo memoryInfo = new ActivityManager.MemoryInfo();
        manager.getMemoryInfo(memoryInfo);
        int logicalCpuCores = Math.max(Runtime.getRuntime().availableProcessors(), 1);
        boolean supportsArm64 = Arrays.asList(Build.SUPPORTED_64_BIT_ABIS).contains("arm64-v8a");
        int thermalStatus = -1;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            PowerManager powerManager =
                (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                thermalStatus = powerManager.getCurrentThermalStatus();
            }
        }

        JSObject result = new JSObject();
        result.put("totalMemoryMb", memoryInfo.totalMem / (1024L * 1024L));
        result.put("availableMemoryMb", memoryInfo.availMem / (1024L * 1024L));
        result.put("memoryClassMb", manager.getMemoryClass());
        result.put("largeMemoryClassMb", manager.getLargeMemoryClass());
        result.put("logicalCpuCores", logicalCpuCores);
        result.put("isLowRamDevice", manager.isLowRamDevice());
        result.put("supportsArm64", supportsArm64);
        result.put("supportedAbis", new JSArray(Arrays.asList(Build.SUPPORTED_ABIS)));
        result.put("androidSdk", Build.VERSION.SDK_INT);
        result.put("thermalStatus", thermalStatus);
        call.resolve(result);
    }

    @PluginMethod
    public void initialize(PluginCall call) {
        String requestedTier = call.getString("tier", "").toLowerCase(Locale.ROOT);
        if (!SUPPORTED_TIERS.contains(requestedTier)) {
            call.reject("ASR tier must be Low, Medium, or High.", "INVALID_ASR_TIER");
            return;
        }

        synchronized (stateLock) {
            if (destroyed) {
                call.reject("Offline ASR has already shut down.", "ASR_SHUT_DOWN");
                return;
            }
            if (initializing || processing || recorder != null) {
                call.reject("Offline ASR is currently busy.", "ASR_BUSY");
                return;
            }
            initializing = true;
        }

        inferenceExecutor.execute(() -> initializeModel(call, requestedTier));
    }

    @PluginMethod
    public void startRecording(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "microphonePermissionCallback");
            return;
        }

        startRecordingWithPermission(call);
    }

    @PermissionCallback
    private void microphonePermissionCallback(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            call.reject(
                "Microphone permission is required for offline speech recognition.",
                "MICROPHONE_PERMISSION_DENIED"
            );
            return;
        }

        startRecordingWithPermission(call);
    }

    @PluginMethod
    public void stopAndTranscribe(PluginCall call) {
        PcmAudioRecorder currentRecorder;
        String tier;

        synchronized (stateLock) {
            if (recorder == null) {
                call.reject("No offline ASR recording is active.", "ASR_NOT_RECORDING");
                return;
            }
            if (processing) {
                call.reject("Offline ASR is currently busy.", "ASR_BUSY");
                return;
            }

            currentRecorder = recorder;
            recorder = null;
            processing = true;
            tier = activeTier;
        }

        inferenceExecutor.execute(() -> transcribeRecording(call, currentRecorder, tier));
    }

    @PluginMethod
    public void cancelRecording(PluginCall call) {
        PcmAudioRecorder currentRecorder;

        synchronized (stateLock) {
            if (recorder == null) {
                call.resolve();
                return;
            }
            if (processing) {
                call.reject("Offline ASR is currently busy.", "ASR_BUSY");
                return;
            }

            currentRecorder = recorder;
            recorder = null;
            processing = true;
        }

        inferenceExecutor.execute(() -> {
            try {
                currentRecorder.cancel();
                call.resolve();
            } catch (RuntimeException error) {
                call.reject("The microphone could not be cancelled.", "MICROPHONE_STOP_FAILED", error);
            } finally {
                synchronized (stateLock) {
                    processing = false;
                }
            }
        });
    }

    @PluginMethod
    public void getRuntimeState(PluginCall call) {
        JSObject result = new JSObject();
        synchronized (stateLock) {
            result.put("initialized", contextPointer != 0);
            result.put("tier", activeTier);
            result.put("recording", recorder != null);
            result.put("busy", initializing || processing);
            result.put("threads", inferenceThreads);
        }
        call.resolve(result);
    }

    @PluginMethod
    public void shutdown(PluginCall call) {
        PcmAudioRecorder currentRecorder;
        synchronized (stateLock) {
            if (initializing || processing) {
                call.reject("Offline ASR is currently busy.", "ASR_BUSY");
                return;
            }
            currentRecorder = recorder;
            recorder = null;
            processing = true;
        }

        inferenceExecutor.execute(() -> {
            try {
                if (currentRecorder != null) {
                    currentRecorder.cancel();
                }
                releaseModel();
                call.resolve();
            } catch (RuntimeException error) {
                call.reject("Offline ASR could not shut down cleanly.", "ASR_SHUTDOWN_FAILED", error);
            } finally {
                synchronized (stateLock) {
                    processing = false;
                }
            }
        });
    }

    @Override
    protected void handleOnPause() {
        PcmAudioRecorder currentRecorder;
        synchronized (stateLock) {
            currentRecorder = recorder;
            recorder = null;
            if (currentRecorder != null) {
                processing = true;
            }
        }

        if (currentRecorder != null) {
            inferenceExecutor.execute(() -> {
                try {
                    currentRecorder.cancel();
                } catch (RuntimeException ignored) {
                    // Backgrounding must never crash the activity.
                } finally {
                    synchronized (stateLock) {
                        processing = false;
                    }
                }
            });
        }
        super.handleOnPause();
    }

    @Override
    protected void handleOnDestroy() {
        PcmAudioRecorder currentRecorder;
        synchronized (stateLock) {
            destroyed = true;
            currentRecorder = recorder;
            recorder = null;
        }

        if (currentRecorder != null) {
            try {
                currentRecorder.cancel();
            } catch (RuntimeException ignored) {
                // Android is already destroying this plugin.
            }
        }

        inferenceExecutor.execute(this::releaseModel);
        inferenceExecutor.shutdown();
        super.handleOnDestroy();
    }

    private void initializeModel(PluginCall call, String tier) {
        long startedAt = SystemClock.elapsedRealtime();
        try {
            releaseModel();
            long initializedContext = WhisperNative.initContextFromAsset(
                getContext().getAssets(),
                "asr/models/" + tier + ".bin"
            );
            if (initializedContext == 0) {
                throw new IllegalStateException("The selected ASR model returned an empty context.");
            }

            contextPointer = initializedContext;
            activeTier = tier;
            inferenceThreads = chooseInferenceThreads();

            JSObject result = new JSObject();
            result.put("tier", tier);
            result.put("loadDurationMs", SystemClock.elapsedRealtime() - startedAt);
            result.put("threads", inferenceThreads);
            result.put("runtime", "whisper.cpp");
            result.put("systemInfo", WhisperNative.getSystemInfo());
            call.resolve(result);
        } catch (RuntimeException error) {
            releaseModel();
            call.reject(
                "The selected offline ASR model could not be initialized.",
                "ASR_INITIALIZATION_FAILED",
                error
            );
        } catch (UnsatisfiedLinkError error) {
            releaseModel();
            call.reject(
                "The offline ASR native runtime could not be loaded.",
                "ASR_NATIVE_RUNTIME_UNAVAILABLE",
                new IllegalStateException(error)
            );
        } finally {
            synchronized (stateLock) {
                initializing = false;
            }
        }
    }

    private void startRecordingWithPermission(PluginCall call) {
        int maximumDurationMillis = call.getInt(
            "maxDurationMs",
            DEFAULT_MAX_RECORDING_MILLIS
        );
        if (
            maximumDurationMillis < MIN_MAX_RECORDING_MILLIS ||
            maximumDurationMillis > MAX_RECORDING_MILLIS
        ) {
            call.reject("Recording duration must be between 1 and 60 seconds.", "INVALID_RECORDING_DURATION");
            return;
        }

        synchronized (stateLock) {
            if (destroyed || contextPointer == 0) {
                call.reject("Initialize offline ASR before recording.", "ASR_NOT_INITIALIZED");
                return;
            }
            if (initializing || processing || recorder != null) {
                call.reject("Offline ASR is currently busy.", "ASR_BUSY");
                return;
            }

            PcmAudioRecorder nextRecorder = new PcmAudioRecorder(maximumDurationMillis);
            try {
                nextRecorder.start();
                recorder = nextRecorder;
            } catch (RuntimeException error) {
                call.reject("The microphone could not start.", "MICROPHONE_START_FAILED", error);
                return;
            }
        }

        JSObject result = new JSObject();
        result.put("sampleRateHz", PcmAudioRecorder.SAMPLE_RATE_HZ);
        result.put("maxDurationMs", maximumDurationMillis);
        call.resolve(result);
    }

    private void transcribeRecording(
        PluginCall call,
        PcmAudioRecorder currentRecorder,
        String tier
    ) {
        try {
            float[] samples = currentRecorder.stopAndGetSamples();
            if (contextPointer == 0) {
                throw new IllegalStateException("The offline ASR model is no longer initialized.");
            }

            long startedAt = SystemClock.elapsedRealtime();
            String transcript = WhisperNative
                .transcribe(contextPointer, inferenceThreads, samples)
                .trim();

            JSObject result = new JSObject();
            result.put("transcript", transcript);
            result.put("tier", tier);
            result.put("sampleCount", samples.length);
            result.put(
                "audioDurationMs",
                (samples.length * 1000L) / PcmAudioRecorder.SAMPLE_RATE_HZ
            );
            result.put("inferenceDurationMs", SystemClock.elapsedRealtime() - startedAt);
            call.resolve(result);
        } catch (RuntimeException error) {
            call.reject("Offline speech recognition failed.", "ASR_TRANSCRIPTION_FAILED", error);
        } finally {
            synchronized (stateLock) {
                processing = false;
            }
        }
    }

    private int chooseInferenceThreads() {
        int logicalCpuCores = Math.max(Runtime.getRuntime().availableProcessors(), 1);
        return Math.max(1, Math.min(logicalCpuCores - 1, 6));
    }

    private void releaseModel() {
        long currentContext = contextPointer;
        contextPointer = 0;
        activeTier = null;
        if (currentContext != 0) {
            WhisperNative.freeContext(currentContext);
        }
    }
}

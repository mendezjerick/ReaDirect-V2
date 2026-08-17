package com.readirect.offline.asr;

import android.annotation.SuppressLint;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import java.util.concurrent.atomic.AtomicBoolean;

final class PcmAudioRecorder {
    static final int SAMPLE_RATE_HZ = 16000;
    private static final int MINIMUM_TRANSCRIBABLE_SAMPLES = 800;
    private static final long STOP_TIMEOUT_MILLIS = 5000;

    private final int maxSamples;
    private final PcmSampleBuffer samples = new PcmSampleBuffer(SAMPLE_RATE_HZ * 4);
    private final AtomicBoolean stopRequested = new AtomicBoolean(false);

    private volatile AudioRecord audioRecord;
    private volatile RuntimeException captureFailure;
    private Thread captureThread;

    PcmAudioRecorder(int maxDurationMillis) {
        maxSamples = Math.multiplyExact(SAMPLE_RATE_HZ, maxDurationMillis) / 1000;
    }

    @SuppressLint("MissingPermission")
    synchronized void start() {
        if (captureThread != null) {
            throw new IllegalStateException("Audio recording has already started.");
        }

        int minimumBufferBytes = AudioRecord.getMinBufferSize(
            SAMPLE_RATE_HZ,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        );
        if (minimumBufferBytes <= 0) {
            throw new IllegalStateException("This device cannot provide 16 kHz microphone audio.");
        }

        int bufferBytes = Math.max(minimumBufferBytes * 2, SAMPLE_RATE_HZ);
        AudioRecord recorder = new AudioRecord(
            MediaRecorder.AudioSource.VOICE_RECOGNITION,
            SAMPLE_RATE_HZ,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            bufferBytes
        );
        if (recorder.getState() != AudioRecord.STATE_INITIALIZED) {
            recorder.release();
            throw new IllegalStateException("The microphone could not be initialized.");
        }

        audioRecord = recorder;
        captureThread = new Thread(
            () -> captureLoop(recorder, bufferBytes / 2),
            "readirect-offline-audio"
        );
        captureThread.start();
    }

    float[] stopAndGetSamples() {
        stopAndJoin();
        if (captureFailure != null) {
            throw captureFailure;
        }
        if (samples.size() < MINIMUM_TRANSCRIBABLE_SAMPLES) {
            throw new IllegalStateException("The recorded audio is too short to transcribe.");
        }
        return samples.toNormalizedFloatArray();
    }

    void cancel() {
        stopAndJoin();
    }

    private void captureLoop(AudioRecord recorder, int bufferSamples) {
        short[] buffer = new short[bufferSamples];

        try {
            recorder.startRecording();
            while (!stopRequested.get() && samples.size() < maxSamples) {
                int remaining = maxSamples - samples.size();
                int read = recorder.read(buffer, 0, Math.min(buffer.length, remaining));
                if (read > 0) {
                    samples.append(buffer, read);
                } else if (!stopRequested.get()) {
                    throw new IllegalStateException(
                        "The microphone stopped while audio was being captured."
                    );
                }
            }
        } catch (RuntimeException error) {
            if (!stopRequested.get()) {
                captureFailure = error;
            }
        } finally {
            try {
                if (recorder.getRecordingState() == AudioRecord.RECORDSTATE_RECORDING) {
                    recorder.stop();
                }
            } catch (RuntimeException ignored) {
                // The stop request may already have stopped the recorder.
            }
            recorder.release();
            audioRecord = null;
        }
    }

    private void stopAndJoin() {
        stopRequested.set(true);
        AudioRecord currentRecorder = audioRecord;
        if (currentRecorder != null) {
            try {
                if (currentRecorder.getRecordingState() == AudioRecord.RECORDSTATE_RECORDING) {
                    currentRecorder.stop();
                }
            } catch (RuntimeException ignored) {
                // The capture thread will report a real failure if one occurred.
            }
        }

        Thread currentThread = captureThread;
        if (currentThread == null) {
            return;
        }

        try {
            currentThread.join(STOP_TIMEOUT_MILLIS);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while stopping the microphone.", error);
        }

        if (currentThread.isAlive()) {
            throw new IllegalStateException("The microphone did not stop in time.");
        }
    }
}

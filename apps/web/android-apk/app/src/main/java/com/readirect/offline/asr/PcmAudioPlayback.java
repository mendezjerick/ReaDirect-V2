package com.readirect.offline.asr;

import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTrack;
import android.os.SystemClock;
import java.util.concurrent.atomic.AtomicBoolean;

final class PcmAudioPlayback {
    private static final long PLAYBACK_POLL_MILLIS = 16;

    private final AtomicBoolean stopped = new AtomicBoolean(false);
    private volatile AudioTrack audioTrack;

    void play(float[] samples) {
        short[] pcm = toPcm16(samples);
        int minimumBufferBytes = AudioTrack.getMinBufferSize(
            PcmAudioRecorder.SAMPLE_RATE_HZ,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        );
        if (minimumBufferBytes <= 0) {
            throw new IllegalStateException("This device cannot play 16 kHz recording audio.");
        }

        AudioTrack track = new AudioTrack.Builder()
            .setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
            )
            .setAudioFormat(
                new AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(PcmAudioRecorder.SAMPLE_RATE_HZ)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build()
            )
            .setBufferSizeInBytes(Math.max(minimumBufferBytes, PcmAudioRecorder.SAMPLE_RATE_HZ * 2))
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build();
        if (track.getState() != AudioTrack.STATE_INITIALIZED) {
            track.release();
            throw new IllegalStateException("Recording playback could not be initialized.");
        }

        audioTrack = track;
        try {
            track.play();
            int offset = 0;
            while (!stopped.get() && offset < pcm.length) {
                int written = track.write(
                    pcm,
                    offset,
                    pcm.length - offset,
                    AudioTrack.WRITE_BLOCKING
                );
                if (written <= 0) {
                    throw new IllegalStateException("Recording playback stopped unexpectedly.");
                }
                offset += written;
            }

            while (!stopped.get() && track.getPlaybackHeadPosition() < pcm.length) {
                SystemClock.sleep(PLAYBACK_POLL_MILLIS);
            }
            if (stopped.get()) {
                throw new IllegalStateException("Recording playback was stopped.");
            }
        } finally {
            audioTrack = null;
            release(track);
        }
    }

    void stop() {
        stopped.set(true);
        AudioTrack track = audioTrack;
        if (track != null) {
            release(track);
        }
    }

    static short[] toPcm16(float[] samples) {
        short[] pcm = new short[samples.length];
        for (int index = 0; index < samples.length; index += 1) {
            float normalized = Math.max(-1f, Math.min(1f, samples[index]));
            pcm[index] = (short) Math.round(normalized * Short.MAX_VALUE);
        }
        return pcm;
    }

    private static void release(AudioTrack track) {
        try {
            if (track.getPlayState() == AudioTrack.PLAYSTATE_PLAYING) {
                track.stop();
            }
        } catch (RuntimeException ignored) {
            // A concurrent stop may already have released the track.
        }
        try {
            track.release();
        } catch (RuntimeException ignored) {
            // Release is best effort during app backgrounding and teardown.
        }
    }
}

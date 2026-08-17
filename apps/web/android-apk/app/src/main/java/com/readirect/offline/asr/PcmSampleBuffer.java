package com.readirect.offline.asr;

import java.util.Arrays;

final class PcmSampleBuffer {
    private short[] samples;
    private int size;

    PcmSampleBuffer(int initialCapacity) {
        samples = new short[Math.max(initialCapacity, 1)];
    }

    synchronized void append(short[] source, int count) {
        if (count < 0 || count > source.length) {
            throw new IllegalArgumentException("Invalid PCM sample count.");
        }

        ensureCapacity(size + count);
        System.arraycopy(source, 0, samples, size, count);
        size += count;
    }

    synchronized int size() {
        return size;
    }

    synchronized float[] toNormalizedFloatArray() {
        float[] normalized = new float[size];
        for (int index = 0; index < size; index += 1) {
            normalized[index] = samples[index] / 32768.0f;
        }
        return normalized;
    }

    private void ensureCapacity(int requiredCapacity) {
        if (requiredCapacity <= samples.length) {
            return;
        }

        int nextCapacity = Math.max(requiredCapacity, samples.length * 2);
        samples = Arrays.copyOf(samples, nextCapacity);
    }
}

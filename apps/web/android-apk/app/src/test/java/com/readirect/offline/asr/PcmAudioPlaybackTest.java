package com.readirect.offline.asr;

import static org.junit.Assert.assertArrayEquals;

import org.junit.Test;

public final class PcmAudioPlaybackTest {
    @Test
    public void convertsNormalizedSamplesToClampedPcm16() {
        short[] pcm = PcmAudioPlayback.toPcm16(
            new float[] { -2f, -1f, -0.5f, 0f, 0.5f, 1f, 2f }
        );

        assertArrayEquals(
            new short[] {
                -32767,
                -32767,
                -16383,
                0,
                16384,
                32767,
                32767,
            },
            pcm
        );
    }
}

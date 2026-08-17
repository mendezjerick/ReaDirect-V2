package com.readirect.offline.asr;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class PcmSampleBufferTest {
    @Test
    public void growsWithoutBoxingAndPreservesSamples() {
        PcmSampleBuffer buffer = new PcmSampleBuffer(1);

        buffer.append(new short[] { Short.MIN_VALUE, 0 }, 2);
        buffer.append(new short[] { Short.MAX_VALUE }, 1);

        assertEquals(3, buffer.size());
        assertArrayEquals(
            new float[] { -1.0f, 0.0f, Short.MAX_VALUE / 32768.0f },
            buffer.toNormalizedFloatArray(),
            0.00001f
        );
    }

    @Test(expected = IllegalArgumentException.class)
    public void rejectsAReadCountBeyondTheSourceBuffer() {
        new PcmSampleBuffer(1).append(new short[] { 1 }, 2);
    }
}

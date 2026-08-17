package com.readirect.offline.tts;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public final class OfflineTtsCatalogTest {
    @Test
    public void acceptsPackagedSpeechKeysAndPaths() {
        assertTrue(OfflineTtsCatalog.isSafeKey("lesson-6-question-who-1"));
        assertTrue(
            OfflineTtsCatalog.isSafePath(
                "lessons/lesson-6/questions/lesson-6-question-who-1.ogg"
            )
        );
    }

    @Test
    public void rejectsTraversalAndInvalidKeys() {
        assertFalse(OfflineTtsCatalog.isSafeKey("../lesson-1"));
        assertFalse(OfflineTtsCatalog.isSafeKey("lesson 1"));
        assertFalse(OfflineTtsCatalog.isSafePath("../private/voice.ogg"));
        assertFalse(OfflineTtsCatalog.isSafePath("/absolute/voice.ogg"));
        assertFalse(OfflineTtsCatalog.isSafePath("lessons//voice.ogg"));
        assertFalse(OfflineTtsCatalog.isSafePath("lessons/voice.wav"));
    }

    @Test
    public void keepsEnglishAndFilipinoAssetsIndependent() {
        assertTrue(OfflineTtsCatalog.isSafeLanguage("en"));
        assertTrue(OfflineTtsCatalog.isSafeLanguage("fil-PH"));
        assertFalse(OfflineTtsCatalog.isSafeLanguage("../fil-PH"));
    }
}

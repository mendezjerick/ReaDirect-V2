package com.readirect.offline.tts;

import android.content.res.AssetManager;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;

final class OfflineTtsCatalog {
    private static final String CATALOG_ASSET = "tts/catalog.json";
    private static final Pattern SAFE_KEY = Pattern.compile("[A-Za-z0-9-]+");
    private static final Pattern SAFE_PATH = Pattern.compile("[A-Za-z0-9._/-]+\\.ogg");

    record Asset(String key, String path, long bytes, long durationMs) {
        String packagedPath() {
            return "tts/audio/" + path;
        }
    }

    private final String catalogId;
    private final long totalBytes;
    private final long totalDurationMs;
    private final Map<String, Asset> assets;

    private OfflineTtsCatalog(
        String catalogId,
        long totalBytes,
        long totalDurationMs,
        Map<String, Asset> assets
    ) {
        this.catalogId = catalogId;
        this.totalBytes = totalBytes;
        this.totalDurationMs = totalDurationMs;
        this.assets = Collections.unmodifiableMap(assets);
    }

    static OfflineTtsCatalog load(AssetManager assetManager) throws IOException, JSONException {
        String json;
        try (InputStream stream = assetManager.open(CATALOG_ASSET)) {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            byte[] buffer = new byte[8_192];
            int bytesRead;
            while ((bytesRead = stream.read(buffer)) != -1) {
                output.write(buffer, 0, bytesRead);
            }
            json = output.toString(StandardCharsets.UTF_8.name());
        }

        JSONObject root = new JSONObject(json);
        if (root.getInt("schemaVersion") != 2) {
            throw new JSONException("Unsupported offline TTS catalog schema.");
        }
        JSONObject encoding = root.getJSONObject("encoding");
        if (
            !"ogg".equals(encoding.getString("container")) ||
            !"vorbis".equals(encoding.getString("codec")) ||
            encoding.getInt("channels") != 1 ||
            encoding.getInt("sampleRateHz") != 32000
        ) {
            throw new JSONException("Unsupported offline TTS release encoding.");
        }

        JSONArray rows = root.getJSONArray("assets");
        Map<String, Asset> assets = new LinkedHashMap<>();
        long observedBytes = 0;
        long observedDurationMs = 0;

        for (int index = 0; index < rows.length(); index += 1) {
            JSONObject row = rows.getJSONObject(index);
            String key = row.getString("key");
            String path = row.getString("path");
            long bytes = row.getLong("bytes");
            long durationMs = row.getLong("durationMs");

            if (!isSafeKey(key) || !isSafePath(path)) {
                throw new JSONException("Unsafe offline TTS catalog entry: " + key);
            }
            if (assets.put(key, new Asset(key, path, bytes, durationMs)) != null) {
                throw new JSONException("Duplicate offline TTS speech key: " + key);
            }

            observedBytes += bytes;
            observedDurationMs += durationMs;
        }

        if (rows.length() != root.getInt("assetCount")) {
            throw new JSONException("Offline TTS asset count does not match its catalog.");
        }
        if (observedBytes != root.getLong("totalBytes")) {
            throw new JSONException("Offline TTS byte total does not match its catalog.");
        }
        if (observedDurationMs != root.getLong("totalDurationMs")) {
            throw new JSONException("Offline TTS duration does not match its catalog.");
        }

        return new OfflineTtsCatalog(
            root.getString("catalogId"),
            observedBytes,
            observedDurationMs,
            assets
        );
    }

    static boolean isSafeKey(String key) {
        return key != null && SAFE_KEY.matcher(key).matches();
    }

    static boolean isSafePath(String path) {
        return path != null
            && !path.startsWith("/")
            && !path.contains("//")
            && !path.contains("..")
            && SAFE_PATH.matcher(path).matches();
    }

    String catalogId() {
        return catalogId;
    }

    long totalBytes() {
        return totalBytes;
    }

    long totalDurationMs() {
        return totalDurationMs;
    }

    int size() {
        return assets.size();
    }

    Asset find(String key) {
        return assets.get(key);
    }
}

package com.readirect.offline.tts;

import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.MediaPlayer;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;

@CapacitorPlugin(name = "OfflineTts")
public final class OfflineTtsPlugin extends Plugin {
    private final Object stateLock = new Object();

    private OfflineTtsCatalog catalog;
    private MediaPlayer player;
    private PluginCall activeCall;
    private String activeKey;
    private boolean preparing;
    private boolean destroyed;

    @PluginMethod
    public void prepare(PluginCall call) {
        synchronized (stateLock) {
            if (destroyed) {
                call.reject("Offline speech playback has shut down.", "TTS_SHUT_DOWN");
                return;
            }

            try {
                if (catalog == null) {
                    catalog = OfflineTtsCatalog.load(getContext().getAssets());
                }
                call.resolve(catalogSummary(catalog));
            } catch (Exception error) {
                catalog = null;
                call.reject(
                    "The packaged offline speech catalog could not be loaded.",
                    "TTS_CATALOG_INVALID",
                    error
                );
            }
        }
    }

    @PluginMethod
    public void play(PluginCall call) {
        String key = call.getString("key", "");
        OfflineTtsCatalog.Asset asset;

        synchronized (stateLock) {
            if (destroyed) {
                call.reject("Offline speech playback has shut down.", "TTS_SHUT_DOWN");
                return;
            }
            if (catalog == null) {
                call.reject("Prepare offline speech before playback.", "TTS_NOT_PREPARED");
                return;
            }

            asset = catalog.find(key);
            if (asset == null) {
                call.reject("This offline speech line is not packaged: " + key, "TTS_KEY_NOT_FOUND");
                return;
            }

            interruptActiveLocked();
            preparing = true;
            activeCall = call;
            activeKey = key;
        }

        MediaPlayer nextPlayer = new MediaPlayer();
        nextPlayer.setAudioAttributes(
            new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ASSISTANCE_ACCESSIBILITY)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build()
        );
        nextPlayer.setOnPreparedListener(readyPlayer -> {
            synchronized (stateLock) {
                if (player != readyPlayer || destroyed) {
                    return;
                }
                preparing = false;
                readyPlayer.start();
            }
        });
        nextPlayer.setOnCompletionListener(completedPlayer -> completePlayback(completedPlayer, asset));
        nextPlayer.setOnErrorListener((failedPlayer, what, extra) -> {
            failPlayback(
                failedPlayer,
                "Offline speech playback failed (" + what + "/" + extra + ").",
                "TTS_PLAYBACK_FAILED"
            );
            return true;
        });

        try (AssetFileDescriptor descriptor =
            getContext().getAssets().openFd(asset.packagedPath())) {
            nextPlayer.setDataSource(
                descriptor.getFileDescriptor(),
                descriptor.getStartOffset(),
                descriptor.getLength()
            );
            synchronized (stateLock) {
                if (activeCall != call || destroyed) {
                    nextPlayer.release();
                    return;
                }
                player = nextPlayer;
            }
            nextPlayer.prepareAsync();
        } catch (IOException | RuntimeException error) {
            synchronized (stateLock) {
                if (player == nextPlayer) {
                    player = null;
                }
                if (activeCall == call) {
                    activeCall = null;
                    activeKey = null;
                    preparing = false;
                }
            }
            nextPlayer.release();
            call.reject(
                "The packaged offline speech file could not be opened.",
                "TTS_ASSET_UNAVAILABLE",
                error
            );
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        synchronized (stateLock) {
            interruptActiveLocked();
        }
        call.resolve();
    }

    @PluginMethod
    public void getRuntimeState(PluginCall call) {
        JSObject result = new JSObject();
        synchronized (stateLock) {
            result.put("prepared", catalog != null);
            result.put("playing", player != null && !preparing);
            result.put("preparing", preparing);
            result.put("key", activeKey);
            result.put("assetCount", catalog == null ? 0 : catalog.size());
            result.put("totalBytes", catalog == null ? 0 : catalog.totalBytes());
        }
        call.resolve(result);
    }

    @PluginMethod
    public void shutdown(PluginCall call) {
        synchronized (stateLock) {
            interruptActiveLocked();
            catalog = null;
        }
        call.resolve();
    }

    @Override
    protected void handleOnPause() {
        synchronized (stateLock) {
            interruptActiveLocked();
        }
        super.handleOnPause();
    }

    @Override
    protected void handleOnDestroy() {
        synchronized (stateLock) {
            destroyed = true;
            interruptActiveLocked();
            catalog = null;
        }
        super.handleOnDestroy();
    }

    private JSObject catalogSummary(OfflineTtsCatalog loadedCatalog) {
        JSObject result = new JSObject();
        result.put("catalogId", loadedCatalog.catalogId());
        result.put("assetCount", loadedCatalog.size());
        result.put("totalBytes", loadedCatalog.totalBytes());
        result.put("totalDurationMs", loadedCatalog.totalDurationMs());
        return result;
    }

    private void completePlayback(MediaPlayer completedPlayer, OfflineTtsCatalog.Asset asset) {
        PluginCall completedCall;
        synchronized (stateLock) {
            if (player != completedPlayer) {
                return;
            }
            completedCall = activeCall;
            clearActiveLocked();
        }

        if (completedCall != null) {
            JSObject result = new JSObject();
            result.put("key", asset.key());
            result.put("durationMs", asset.durationMs());
            result.put("completed", true);
            completedCall.resolve(result);
        }
    }

    private void failPlayback(
        MediaPlayer failedPlayer,
        String message,
        String code
    ) {
        PluginCall failedCall;
        synchronized (stateLock) {
            if (player != failedPlayer) {
                return;
            }
            failedCall = activeCall;
            clearActiveLocked();
        }
        if (failedCall != null) {
            failedCall.reject(message, code);
        }
    }

    private void interruptActiveLocked() {
        PluginCall interruptedCall = activeCall;
        clearActiveLocked();
        if (interruptedCall != null) {
            interruptedCall.reject(
                "Offline speech playback was interrupted.",
                "TTS_INTERRUPTED"
            );
        }
    }

    private void clearActiveLocked() {
        MediaPlayer currentPlayer = player;
        player = null;
        activeCall = null;
        activeKey = null;
        preparing = false;

        if (currentPlayer != null) {
            currentPlayer.setOnPreparedListener(null);
            currentPlayer.setOnCompletionListener(null);
            currentPlayer.setOnErrorListener(null);
            currentPlayer.release();
        }
    }
}

package com.readirect.offline.learner;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(name = "OfflineLearnerStore")
public final class OfflineLearnerStorePlugin extends Plugin {
    private static final String PREFERENCES_NAME = "readirect_offline_learner_v1";
    private static final String STATE_KEY = "state_json";
    private static final String REVISION_KEY = "revision";
    private static final String BACKUP_STATE_KEY = "backup_state_json";
    private static final String BACKUP_REVISION_KEY = "backup_revision";
    private static final int SCHEMA_VERSION = 2;

    private final Object stateLock = new Object();

    @PluginMethod
    public void load(PluginCall call) {
        synchronized (stateLock) {
            SharedPreferences preferences = preferences();
            JSObject result = new JSObject();
            result.put("revision", preferences.getLong(REVISION_KEY, 0));
            result.put("stateJson", preferences.getString(STATE_KEY, null));
            result.put(
                "backupRevision",
                preferences.getLong(BACKUP_REVISION_KEY, 0)
            );
            result.put(
                "backupStateJson",
                preferences.getString(BACKUP_STATE_KEY, null)
            );
            call.resolve(result);
        }
    }

    @PluginMethod
    public void save(PluginCall call) {
        Object expectedRevisionValue = call.getData().opt("expectedRevision");
        String stateJson = call.getString("stateJson");
        if (!(expectedRevisionValue instanceof Number) || stateJson == null) {
            call.reject(
                "Offline learner progress requires a valid expected revision and state.",
                "LOCAL_PROGRESS_INVALID_WRITE"
            );
            return;
        }
        long expectedRevision = ((Number) expectedRevisionValue).longValue();
        if (expectedRevision < 0) {
            call.reject(
                "Offline learner progress requires a valid expected revision and state.",
                "LOCAL_PROGRESS_INVALID_WRITE"
            );
            return;
        }

        final long nextRevision;
        try {
            nextRevision = validateState(stateJson, expectedRevision);
        } catch (JSONException | IllegalArgumentException error) {
            call.reject(
                "Offline learner progress failed validation.",
                "LOCAL_PROGRESS_INVALID_WRITE",
                error
            );
            return;
        }

        synchronized (stateLock) {
            SharedPreferences preferences = preferences();
            long currentRevision = preferences.getLong(REVISION_KEY, 0);
            if (currentRevision != expectedRevision) {
                call.reject(
                    "Offline learner progress changed before this update could be saved.",
                    "LOCAL_PROGRESS_STALE_WRITE"
                );
                return;
            }

            String currentState = preferences.getString(STATE_KEY, null);
            SharedPreferences.Editor editor = preferences.edit();
            if (currentState != null) {
                editor.putString(BACKUP_STATE_KEY, currentState);
                editor.putLong(BACKUP_REVISION_KEY, currentRevision);
            }
            editor.putString(STATE_KEY, stateJson);
            editor.putLong(REVISION_KEY, nextRevision);

            if (!editor.commit()) {
                call.reject(
                    "Android could not commit offline learner progress.",
                    "LOCAL_PROGRESS_WRITE_FAILED"
                );
                return;
            }

            JSObject result = new JSObject();
            result.put("revision", nextRevision);
            call.resolve(result);
        }
    }

    static long validateState(String stateJson, long expectedRevision) throws JSONException {
        JSONObject state = new JSONObject(stateJson);
        if (state.getInt("schemaVersion") != SCHEMA_VERSION) {
            throw new IllegalArgumentException("Unsupported offline learner schema.");
        }

        long nextRevision = state.getLong("revision");
        if (nextRevision != expectedRevision + 1) {
            throw new IllegalArgumentException(
                "Offline learner revision must increase by exactly one."
            );
        }
        if (!state.has("profile") || !state.has("setup") || !state.has("journey")) {
            throw new IllegalArgumentException("Offline learner state is incomplete.");
        }
        return nextRevision;
    }

    private SharedPreferences preferences() {
        return getContext().getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
    }
}

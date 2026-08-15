package com.readirect.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "SecureSession")
public class SecureSessionPlugin extends Plugin {
    private static final String KEY_ALIAS = "readirect_secure_session_key_v1";
    private static final String PREFS = "readirect_secure_sessions";
    private static final int GCM_TAG_BITS = 128;

    @PluginMethod
    public void get(PluginCall call) {
        String key = call.getString("key");
        if (!isSafeKey(key)) {
            call.reject("A valid secure-session key is required.");
            return;
        }

        try {
            String encoded = preferences().getString(key, null);
            JSObject result = new JSObject();
            result.put("value", encoded == null ? null : decrypt(encoded));
            call.resolve(result);
        } catch (Exception exception) {
            preferences().edit().remove(key).apply();
            call.reject("The secure session could not be read.");
        }
    }

    @PluginMethod
    public void set(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value");
        if (!isSafeKey(key) || value == null || value.length() > 16384) {
            call.reject("A valid secure-session key and value are required.");
            return;
        }

        try {
            boolean saved = preferences().edit().putString(key, encrypt(value)).commit();
            if (!saved) {
                call.reject("The secure session could not be saved.");
                return;
            }
            call.resolve();
        } catch (Exception exception) {
            call.reject("The secure session could not be saved.");
        }
    }

    @PluginMethod
    public void remove(PluginCall call) {
        String key = call.getString("key");
        if (!isSafeKey(key)) {
            call.reject("A valid secure-session key is required.");
            return;
        }
        if (preferences().edit().remove(key).commit()) {
            call.resolve();
        } else {
            call.reject("The secure session could not be removed.");
        }
    }

    private SharedPreferences preferences() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private SecretKey secretKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        if (keyStore.containsAlias(KEY_ALIAS)) {
            KeyStore.Entry entry = keyStore.getEntry(KEY_ALIAS, null);
            if (entry instanceof KeyStore.SecretKeyEntry) {
                return ((KeyStore.SecretKeyEntry) entry).getSecretKey();
            }
            keyStore.deleteEntry(KEY_ALIAS);
        }

        KeyGenerator generator = KeyGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_AES,
                "AndroidKeyStore"
        );
        generator.init(new KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
        )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setUserAuthenticationRequired(false)
                .build());
        // Return the generated key directly. The KeyStore instance was loaded
        // before generation and may not expose the new alias until reloaded.
        return generator.generateKey();
    }

    private String encrypt(String value) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        SecretKey key;
        try {
            key = secretKey();
        } catch (Exception firstFailure) {
            KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
            keyStore.load(null);
            if (keyStore.containsAlias(KEY_ALIAS)) {
                keyStore.deleteEntry(KEY_ALIAS);
            }
            key = secretKey();
        }
        // Android Keystore-backed AES/GCM keys may reject caller-provided IVs.
        // Let the provider generate a fresh IV and persist that IV with the
        // ciphertext so it can be supplied during decryption.
        cipher.init(Cipher.ENCRYPT_MODE, key);
        byte[] iv = cipher.getIV();
        byte[] ciphertext = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
        byte[] combined = new byte[iv.length + ciphertext.length];
        System.arraycopy(iv, 0, combined, 0, iv.length);
        System.arraycopy(ciphertext, 0, combined, iv.length, ciphertext.length);
        return Base64.encodeToString(combined, Base64.NO_WRAP);
    }

    private String decrypt(String encoded) throws Exception {
        byte[] combined = Base64.decode(encoded, Base64.NO_WRAP);
        if (combined.length <= 12) throw new IllegalArgumentException("Invalid ciphertext");
        byte[] iv = new byte[12];
        byte[] ciphertext = new byte[combined.length - iv.length];
        System.arraycopy(combined, 0, iv, 0, iv.length);
        System.arraycopy(combined, iv.length, ciphertext, 0, ciphertext.length);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, secretKey(), new GCMParameterSpec(GCM_TAG_BITS, iv));
        return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
    }

    private boolean isSafeKey(String key) {
        return key != null && key.matches("[A-Za-z0-9._-]{1,80}");
    }
}

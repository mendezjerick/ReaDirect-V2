package com.readirect.app;

import android.content.pm.ActivityInfo;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ScreenOrientation")
public class ScreenOrientationPlugin extends Plugin {
    @PluginMethod
    public void lockPortrait(PluginCall call) {
        getActivity().setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        call.resolve(new JSObject());
    }

    @PluginMethod
    public void lockLandscape(PluginCall call) {
        getActivity().setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
        call.resolve(new JSObject());
    }

    @PluginMethod
    public void unlock(PluginCall call) {
        getActivity().setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        call.resolve(new JSObject());
    }
}

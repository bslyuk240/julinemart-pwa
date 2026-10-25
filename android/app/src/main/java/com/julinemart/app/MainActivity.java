package com.julinemart.app;

import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    // Longest the native splash waits for the site (slow or no connection).
    private static final long SPLASH_TIMEOUT_MS = 4000;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private boolean keepSplash = true;
    private boolean pageVisible = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Purple launch screen with the logo (AppTheme.NoActionBarLaunch). Hold it
        // until the site first paints, where the web launch animation takes over
        // on the same purple, so there's no white gap in between.
        SplashScreen splash = SplashScreen.installSplashScreen(this);
        splash.setKeepOnScreenCondition(() -> keepSplash);

        super.onCreate(savedInstanceState);

        if (bridge == null) {
            // No WebView available; let Capacitor's fallback screen show.
            keepSplash = false;
            return;
        }

        bridge.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageCommitVisible(WebView view, String url) {
                pageVisible = true;
                keepSplash = false;
            }

            @Override
            public void onReceivedError(WebView webView) {
                releaseWithoutPage();
            }
        });
        mainHandler.postDelayed(this::releaseWithoutPage, SPLASH_TIMEOUT_MS);

        // Android 15+ draws the app under transparent system bars, so the purple
        // shows behind them: use light icons until the site's launch animation
        // ends and it switches them back (launch-splash.tsx). Posted so it runs
        // after the SystemBars plugin applies its configured LIGHT style. Older
        // versions keep their opaque white bars and dark icons.
        if (Build.VERSION.SDK_INT >= 35) {
            mainHandler.post(() -> setDarkBarIcons(false));
        }
    }

    // Offline, a failed load or a slow connection: drop the splash, and if the
    // site hasn't painted, use dark icons for the WebView's white error page.
    private void releaseWithoutPage() {
        keepSplash = false;
        if (!pageVisible) setDarkBarIcons(true);
    }

    private void setDarkBarIcons(boolean dark) {
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
            .setAppearanceLightStatusBars(dark);
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
            .setAppearanceLightNavigationBars(dark);
    }
}

package com.renqing.radar;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

/**
 * EQ-Worker · 安卓壳
 *
 * 设计原则：
 *  1. 网页版是单文件自包含 HTML（约 1.1MB，零依赖），壳只做三件事：
 *     加载 assets/index.html、开 DOM 存储（localStorage 持久化）、返回键交给网页历史。
 *  2. 用 WebViewAssetLoader 把 assets 映射成 https 自定义域 ——
 *     file:// 协议下部分 WebView 版本的 localStorage 行为不一致，https 域是官方推荐做法。
 *  3. 不申请存储权限：数据全部落在应用私有目录，卸载即清（应用内自带 JSON/CSV/剪贴板备份）。
 */
public class MainActivity extends Activity {

    /** 应用内资源的虚拟域：与 assets 目录一一对应 */
    private static final String VIRTUAL_DOMAIN = "appassets.eqworker.local";
    private static final String START_URL = "https://" + VIRTUAL_DOMAIN + "/assets/index.html";

    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 沉浸式：纸底状态栏，正文从状態栏下开始（与网页版 UI 同色）
        Window w = getWindow();
        w.setStatusBarColor(Color.parseColor("#f6f1e4"));
        w.setNavigationBarColor(Color.parseColor("#f6f1e4"));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            w.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
                    | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        }

        webView = new WebView(this);
        setContentView(webView);

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .setDomain(VIRTUAL_DOMAIN)
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);   // localStorage：本地优先的关键
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);    // 收紧：一切经虚拟域
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        s.setDisplayZoomControls(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // 单文件自包含：正常情况无外链；万一有（帮助文档等），仍在壳内打开
                return false;
            }
        });

        webView.loadUrl(START_URL);
    }

    @Override
    public void onBackPressed() {
        // 返回键优先回退网页内视图（五 Tab 是页面内切换，hash 无关）
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) webView.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }
}

package ai.evee.app

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ProgressBar
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private lateinit var progress: ProgressBar
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private val productionHost = "evee-ai.vercel.app"
    private val allowedAppHosts = setOf(
        productionHost,
        productionHost
    )

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(9, 11, 18)
        window.navigationBarColor = Color.rgb(9, 11, 18)

        val root = FrameLayout(this).apply { setBackgroundColor(Color.rgb(9, 11, 18)) }
        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100
            progress = 0
            visibility = View.VISIBLE
        }
        webView = WebView(this).apply {
            setBackgroundColor(Color.rgb(9, 11, 18))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.loadsImagesAutomatically = true
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            settings.javaScriptCanOpenWindowsAutomatically = false
            settings.setSupportMultipleWindows(false)
            settings.allowFileAccess = false
            settings.allowContentAccess = true
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.userAgentString = settings.userAgentString + " EVEEAIAndroid/2.0"
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    val uri = request?.url ?: return false
                    // Keep all normal web navigation inside EVEE's app WebView.
                    // This also handles Vercel deployment redirects and canonical host changes.
                    if (uri.scheme == "https" || uri.scheme == "http") return false

                    // Hand off non-web links (mailto:, tel:, etc.) to Android when supported.
                    return try {
                        startActivity(Intent(Intent.ACTION_VIEW, uri))
                        true
                    } catch (_: Exception) {
                        true
                    }
                }
            }
            webChromeClient = object : WebChromeClient() {
                override fun onProgressChanged(view: WebView?, newProgress: Int) {
                    this@MainActivity.progress.progress = newProgress
                    this@MainActivity.progress.visibility = if (newProgress >= 100) View.GONE else View.VISIBLE
                }

                override fun onShowFileChooser(
                    webView: WebView?,
                    filePathCallback: ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?
                ): Boolean {
                    fileChooserCallback?.onReceiveValue(null)
                    fileChooserCallback = filePathCallback
                    return try {
                        val intent = fileChooserParams?.createIntent()
                        if (intent == null) {
                            fileChooserCallback = null
                            false
                        } else {
                            startActivityForResult(intent, FILE_CHOOSER_REQUEST)
                            true
                        }
                    } catch (_: Exception) {
                        fileChooserCallback?.onReceiveValue(null)
                        fileChooserCallback = null
                        false
                    }
                }
            }
        }
        root.addView(webView, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))
        root.addView(progress, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            dp(3)
        ))
        setContentView(root)

        if (savedInstanceState == null) webView.loadUrl("https://$productionHost/")
        else if (webView.restoreState(savedInstanceState) == null) webView.loadUrl("https://$productionHost/")

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != FILE_CHOOSER_REQUEST) return
        val callback = fileChooserCallback ?: return
        fileChooserCallback = null
        callback.onReceiveValue(
            if (resultCode == RESULT_OK) WebChromeClient.FileChooserParams.parseResult(resultCode, data)
            else null
        )
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onDestroy() {
        fileChooserCallback?.onReceiveValue(null)
        fileChooserCallback = null
        if (::webView.isInitialized) {
            webView.stopLoading()
            webView.destroy()
        }
        super.onDestroy()
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    companion object {
        private const val FILE_CHOOSER_REQUEST = 2026
    }
}

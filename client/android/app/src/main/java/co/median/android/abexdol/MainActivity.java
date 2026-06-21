package co.median.android.abexdol;

import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.webkit.WebView;
import android.webkit.WebResourceRequest;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Use a post-runnable to ensure the bridge and webview are initialized
        this.bridge.getWebView().post(new Runnable() {
            @Override
            public void run() {
                bridge.getWebView().setWebViewClient(new BridgeWebViewClient(bridge) {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                        String url = request.getUrl().toString();
                        if (url.startsWith("upi://") || url.startsWith("phonepe://") || url.startsWith("tez://") || url.startsWith("paytmmp://")) {
                            try {
                                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                view.getContext().startActivity(intent);
                                return true;
                            } catch (Exception e) {
                                // Fallback or fail silently if no app can handle the intent
                                return false;
                            }
                        }
                        return super.shouldOverrideUrlLoading(view, request);
                    }
                });
            }
        });
    }
}

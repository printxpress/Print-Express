package co.median.android.abexdol;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Wait for the WebView to finish initializing and apply our custom client
        this.bridge.getWebView().post(new Runnable() {
            @Override
            public void run() {
                MainActivity.this.bridge.getWebView().setWebViewClient(
                    new BridgeWebViewClient(MainActivity.this.bridge) {
                        @Override
                        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                            String url = request.getUrl().toString();
                            if (url.startsWith("upi://") || url.startsWith("phonepe://") || url.startsWith("tez://") || url.startsWith("paytmmp://")) {
                                try {
                                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                                    view.getContext().startActivity(intent);
                                    return true;
                                } catch (Exception e) {
                                    e.printStackTrace();
                                    return true;
                                }
                            }
                            return super.shouldOverrideUrlLoading(view, request);
                        }

                        @Override
                        public boolean shouldOverrideUrlLoading(WebView view, String url) {
                            if (url.startsWith("upi://") || url.startsWith("phonepe://") || url.startsWith("tez://") || url.startsWith("paytmmp://")) {
                                try {
                                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                                    view.getContext().startActivity(intent);
                                    return true;
                                } catch (Exception e) {
                                    e.printStackTrace();
                                    return true;
                                }
                            }
                            return super.shouldOverrideUrlLoading(view, url);
                        }
                    }
                );
            }
        });
    }
}

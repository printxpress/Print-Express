# Razorpay ProGuard Rules
-keepattributes *Annotation*
-keepattributes Signature
-keepclassmembers class * {
  @android.webkit.JavascriptInterface <methods>;
}
-keep class com.razorpay.** {*;}
-dontwarn com.razorpay.**

# Keep file names and line numbers for human-readable stack traces
-keepattributes SourceFile,LineNumberTable

import Script from "next/script";
import {
  GA_MEASUREMENT_ID,
  GOOGLE_ADS_ID,
  HAS_GTAG,
  HAS_META_PIXEL,
  META_PIXEL_ID,
} from "@/lib/analytics";

// Injects the Google (gtag.js) and/or Meta Pixel tags — but only the ones
// whose env vars are set. With nothing configured, this renders nothing and
// the app loads no third-party scripts and sets no tracking cookies.
export function SiteAnalytics() {
  const gtagId = GA_MEASUREMENT_ID || GOOGLE_ADS_ID;

  return (
    <>
      {HAS_GTAG && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              ${GA_MEASUREMENT_ID ? `gtag('config', '${GA_MEASUREMENT_ID}');` : ""}
              ${GOOGLE_ADS_ID ? `gtag('config', '${GOOGLE_ADS_ID}');` : ""}
            `}
          </Script>
        </>
      )}

      {HAS_META_PIXEL && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}
    </>
  );
}

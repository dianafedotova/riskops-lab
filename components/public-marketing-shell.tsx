import { PublicRouteAnalytics } from "@/components/public-route-analytics";
import {
  getGtmId,
  getSilktideConfig,
  getSilktideCssUrl,
  getSilktideJsUrl,
} from "@/lib/marketing-config";
import Script from "next/script";

function buildConsentDefaultsScript(): string {
  return `
    (function () {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

      function readBooleanStorage(key) {
        try {
          return /^true$/i.test(window.localStorage.getItem(key) || "");
        } catch (error) {
          return false;
        }
      }

      function readConsentState() {
        return {
          analyticsGranted: readBooleanStorage("silktideCookieChoice_analytics"),
          marketingGranted: readBooleanStorage("silktideCookieChoice_marketing")
        };
      }

      function applyConsent(mode, state) {
        window.gtag("consent", mode, {
          analytics_storage: state.analyticsGranted ? "granted" : "denied",
          ad_storage: state.marketingGranted ? "granted" : "denied",
          ad_user_data: state.marketingGranted ? "granted" : "denied",
          ad_personalization: state.marketingGranted ? "granted" : "denied",
          wait_for_update: 500
        });
      }

      var lastState = readConsentState();
      applyConsent("default", lastState);

      window.__rolApplyMarketingConsent = function () {
        lastState = readConsentState();
        applyConsent("update", lastState);
      };

      window.setInterval(function () {
        var nextState = readConsentState();
        if (
          nextState.analyticsGranted !== lastState.analyticsGranted ||
          nextState.marketingGranted !== lastState.marketingGranted
        ) {
          lastState = nextState;
          applyConsent("update", nextState);
        }
      }, 1000);
    })();
  `;
}

function buildGtmLoaderScript(gtmId: string): string {
  return `
    (function(w,d,s,l,i){
      w[l]=w[l]||[];
      w[l].push({'gtm.start': new Date().getTime(), event:'gtm.js'});
      var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),
          dl=l!='dataLayer'?'&l='+l:'';
      j.async=true;
      j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
      f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer',${JSON.stringify(gtmId)});
  `;
}

function buildSilktideConfigScript(config: Record<string, unknown>): string {
  const serializedConfig = JSON.stringify(config).replace(/</g, "\\u003c");

  return `
    (function applySilktideConfig(attempt) {
      if (
        window.silktideCookieBannerManager &&
        typeof window.silktideCookieBannerManager.updateCookieBannerConfig === "function"
      ) {
        window.silktideCookieBannerManager.updateCookieBannerConfig(${serializedConfig});
        if (typeof window.__rolApplyMarketingConsent === "function") {
          window.__rolApplyMarketingConsent();
        }
        return;
      }

      if (attempt < 20) {
        window.setTimeout(function () {
          applySilktideConfig(attempt + 1);
        }, 250);
      }
    })(0);
  `;
}

export function PublicMarketingShell() {
  const gtmId = getGtmId();
  const silktideCssUrl = getSilktideCssUrl();
  const silktideJsUrl = getSilktideJsUrl();
  const silktideConfig = getSilktideConfig();

  return (
    <>
      {silktideCssUrl ? (
        <link
          rel="stylesheet"
          id="silktide-consent-manager-css"
          href={silktideCssUrl}
        />
      ) : null}
      <Script id="marketing-consent-defaults" strategy="afterInteractive">
        {buildConsentDefaultsScript()}
      </Script>
      {silktideJsUrl ? (
        <Script id="silktide-consent-manager" src={silktideJsUrl} strategy="afterInteractive" />
      ) : null}
      {silktideConfig ? (
        <Script id="silktide-consent-config" strategy="afterInteractive">
          {buildSilktideConfigScript(silktideConfig)}
        </Script>
      ) : null}
      {gtmId ? (
        <>
          <Script id="google-tag-manager" strategy="afterInteractive">
            {buildGtmLoaderScript(gtmId)}
          </Script>
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
              title="google-tag-manager"
            />
          </noscript>
        </>
      ) : null}
      <PublicRouteAnalytics />
    </>
  );
}

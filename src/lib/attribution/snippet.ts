// Generates the GTM Custom HTML tag a client pastes into their container. The
// tag is self-contained ES5, captures the ordered touch path, and beacons it to
// the client's own first-party collector host. It is a pure string builder so
// the install card and a unit test can both rely on it.

export type SnippetOptions = {
  collectorHost: string; // e.g. metrics.clientsite.com
  siteKey: string;
};

export function buildGtmTag({ collectorHost, siteKey }: SnippetOptions): string {
  const endpoint = `https://${collectorHost}/collect`;
  // The braces below are the snippet's own JS; only ${endpoint} and ${siteKey}
  // are interpolated at generation time.
  return `<script>
(function () {
  var ENDPOINT = ${JSON.stringify(endpoint)};
  var SITE_KEY = ${JSON.stringify(siteKey)};
  var VID_KEY = 'attr_vid';
  var TOUCH_KEY = 'attr_touches';
  var MAX = 50;

  var UTM = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'];
  var CLICK = ['gclid','gbraid','wbraid','dclid','gclsrc','gad_source','srsltid','msclkid','fbclid','ttclid','li_fat_id','twclid','epik','irclickid','rdt_cid','sccid','obclid','yclid','cjevent','wickedid'];

  function ls(k, v) {
    try { if (v === undefined) return window.localStorage.getItem(k); window.localStorage.setItem(k, v); } catch (e) { return null; }
  }
  function uuid() {
    if (window.crypto && crypto.randomUUID) { try { return crypto.randomUUID(); } catch (e) {} }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0, x = c === 'x' ? r : (r & 0x3) | 0x8; return x.toString(16);
    });
  }
  function consentOk() {
    // Respect GTM Consent Mode when present, else an explicit dataLayer flag.
    try {
      var dl = window.dataLayer || [];
      for (var i = dl.length - 1; i >= 0; i--) {
        if (dl[i] && dl[i].attr_consent === true) return true;
        if (dl[i] && dl[i].attr_consent === false) return false;
      }
    } catch (e) {}
    try {
      if (window.google_tag_data && google_tag_data.ics) {
        var s = google_tag_data.ics.getConsentState && google_tag_data.ics.getConsentState('analytics_storage');
        if (s === 2) return false; // denied
      }
    } catch (e2) {}
    return true;
  }

  try {
    if (!consentOk()) return;

    var qs = {}, search = location.search.replace(/^\\?/, ''), pairs, i, p, k, v;
    if (search) {
      pairs = search.split('&');
      for (i = 0; i < pairs.length; i++) {
        p = pairs[i].split('=');
        if (!p[0]) continue;
        try { k = decodeURIComponent(p[0].replace(/\\+/g, ' ')); } catch (e) { k = p[0]; }
        try { v = decodeURIComponent((p[1] || '').replace(/\\+/g, ' ')); } catch (e2) { v = p[1] || ''; }
        qs[k.toLowerCase()] = v;
      }
    }

    var touch = {}, hit = false, j, key;
    for (j = 0; j < UTM.length; j++) { key = UTM[j]; if (qs[key]) { touch[key] = String(qs[key]).slice(0, 512); hit = true; } }
    for (j = 0; j < CLICK.length; j++) { key = CLICK[j]; if (qs[key]) { touch[key] = String(qs[key]).slice(0, 512); hit = true; } }

    var ref = document.referrer || '';
    var refHost = ''; try { refHost = ref.split('/')[2].split(':')[0].toLowerCase().replace(/^www\\./, ''); } catch (e3) {}
    var myHost = location.hostname.toLowerCase().replace(/^www\\./, '');
    var external = !!refHost && refHost !== myHost && refHost.slice(-(myHost.length + 1)) !== '.' + myHost;
    var organic = !hit && external;
    if (!hit && !organic) return;

    touch.referrer = ref;
    touch.landing_page = (location.pathname + location.search).slice(0, 512);
    touch.timestamp = new Date().toISOString();
    touch.is_organic = organic;

    var vid = ls(VID_KEY); if (!vid) { vid = uuid(); ls(VID_KEY, vid); }
    var touches = []; try { touches = JSON.parse(ls(TOUCH_KEY) || '[]') || []; } catch (e4) { touches = []; }
    touches.push(touch);
    if (touches.length > MAX) touches = touches.slice(-MAX);
    ls(TOUCH_KEY, JSON.stringify(touches));

    var body = JSON.stringify({ site_key: SITE_KEY, visitor_id: vid, touches: [touch] });
    var sent = false;
    if (navigator.sendBeacon) { try { sent = navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain' })); } catch (e5) {} }
    if (!sent) {
      try { var x = new XMLHttpRequest(); x.open('POST', ENDPOINT, true); x.withCredentials = true; x.setRequestHeader('Content-Type', 'text/plain'); x.send(body); } catch (e6) {}
    }
  } catch (err) {
    if (window.console && console.warn) console.warn('[attr]', err);
  }
})();
</script>`;
}

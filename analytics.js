(() => {
  'use strict';
  if (window.LumieAnalytics) return;
  const config = window.LUMIE_ANALYTICS_CONFIG || {};
  const id = config.measurementId || '';
  const validId = /^G-[A-Z0-9]{6,20}$/.test(id);
  const key = config.storageKey || 'lumie-skin:analytics-preferences:v1';
  const resumeKey = key + ':resume';
  const basePath = config.basePath || '/lumie-skin-lp/';
  const production = location.origin === config.origin && location.pathname.startsWith(basePath);
  const trackedPage = ['', 'index.html', 'case-study.html'].includes(location.pathname.slice(basePath.length));
  const settingsPage = location.pathname.endsWith('/privacy.html');
  const testMode = window.__LUMIE_ANALYTICS_TEST__ === true || navigator.webdriver === true;
  let storageAvailable = true;
  let preferences = { consent: 'unset', excluded: false };
  let initialized = false;
  let pageViewSent = false;
  let scrollSent = false;
  let banner;
  let message = '';
  let debug = false;
  try {
    const probe = key + ':probe';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
  } catch { storageAvailable = false; }
  const readPreferences = () => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '{}');
      return { consent: ['granted', 'denied'].includes(value.consent) ? value.consent : 'unset', excluded: value.excluded === true };
    } catch { return { consent: 'unset', excluded: false }; }
  };
  preferences = readPreferences();

  // Remove test/opt-out switches before any tag can read the URL.
  const entry = new URL(location.href);
  const optOut = entry.searchParams.get('analytics');
  if (optOut === 'off') {
    preferences.excluded = true;
    try { localStorage.setItem(key, JSON.stringify(preferences)); } catch { storageAvailable = false; }
  }
  debug = entry.searchParams.get('analytics_debug') === '1';
  if (entry.searchParams.has('analytics') || entry.searchParams.has('analytics_debug')) {
    entry.searchParams.delete('analytics');
    entry.searchParams.delete('analytics_debug');
    history.replaceState(history.state, '', entry.href);
  }
  // Use only after the GA4 developer-traffic exclusion filter is active.
  // Debugging never bypasses consent, creator exclusion or automation blocking.
  const destination = id;
  const disabled = () => !validId || !production || !trackedPage || settingsPage || testMode || !storageAvailable || preferences.excluded || preferences.consent !== 'granted';
  const normalizePath = path => path.replace(/\/index\.html$/, '/');
  function cleanURL(raw, campaign = false) {
    try {
      const url = new URL(raw);
      const clean = new URL(url.origin + normalizePath(url.pathname));
      if (campaign) for (const name of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
        const value = url.searchParams.get(name);
        if (value && /^[a-zA-Z0-9_-]{1,80}$/.test(value)) clean.searchParams.set(name, value);
      }
      return clean.href;
    } catch { return ''; }
  }
  const pageLocation = cleanURL(location.href, true);
  const pageReferrer = cleanURL(document.referrer);
  try {
    const saved = JSON.parse(sessionStorage.getItem(resumeKey) || 'null');
    sessionStorage.removeItem(resumeKey);
    if (saved && saved.target === location.href && Date.now() - saved.at >= 0 && Date.now() - saved.at < 120000) {
      pageViewSent = saved.pageViewSent === true;
      scrollSent = saved.scrollSent === true;
    }
  } catch { /* No persistence: a normal page load is still usable. */ }

  function command() { window.dataLayer.push(arguments); }
  function event(name, values = {}) {
    if (!initialized || disabled()) return;
    command('event', name, { ...values, send_to: destination, page_location: pageLocation, page_referrer: pageReferrer });
  }
  function start() {
    window['ga-disable-' + id] = disabled();
    if (destination !== id) window['ga-disable-' + destination] = disabled();
    if (disabled() || initialized) return;
    initialized = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = command;
    command('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    command('js', new Date());
    command('set', { page_location: pageLocation, page_referrer: pageReferrer });
    command('config', destination, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_prefix: 'lumie', cookie_path: basePath, cookie_domain: 'none',
      ...(debug ? { debug_mode: true } : {})
    });
    if (!pageViewSent) { event('page_view'); pageViewSent = true; }
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + destination;
    document.head.append(script);
  }
  function removeCookies() {
    for (const item of document.cookie.split(';')) {
      const name = item.trim().split('=')[0];
      if (name.startsWith('lumie_')) document.cookie = name + '=; Max-Age=0; Path=' + basePath + '; SameSite=Lax; Secure';
    }
  }
  function applyPreferences() {
    const wasDisabled = window['ga-disable-' + id];
    window['ga-disable-' + id] = disabled();
    if (destination !== id) window['ga-disable-' + destination] = disabled();
    if (disabled() && initialized) {
      // Discard unsent queued events too, if consent was revoked before gtag loaded.
      window.dataLayer.length = 0;
      removeCookies();
    }
    if (initialized && wasDisabled && !disabled()) {
      // A previously blocked loader may have had its queue cleared on revocation.
      location.reload();
      return;
    }
    start();
    render();
  }
  function save(update) {
    preferences = { ...preferences, ...update };
    try {
      localStorage.setItem(key, JSON.stringify(preferences));
      storageAvailable = true;
      message = '設定を保存しました。';
    } catch {
      storageAvailable = false;
      message = '設定を保存できません。このページでは計測を停止しています。次回も計測設定をご確認ください。';
    }
    applyPreferences();
  }
  function render() {
    if (!document.body) return;
    const status = document.querySelector('[data-analytics-status]');
    if (status) status.textContent = !storageAvailable ? '保存機能を利用できないため、計測は停止しています。' : preferences.excluded ? 'このブラウザは計測対象から除外されています。' : preferences.consent === 'granted' ? 'アクセス解析への同意が保存されています。' : preferences.consent === 'denied' ? 'アクセス解析を許可していません。' : 'アクセス解析は未選択です。同意するまで送信しません。';
    const availability = document.querySelector('[data-analytics-availability]');
    if (availability) availability.textContent = validId ? 'この設定ページ自体は計測対象外です。' : '現在、アクセス解析の運用開始前です。設定は先に保存できます。この設定ページ自体は計測対象外です。';
    const feedback = document.querySelector('[data-analytics-feedback]');
    if (feedback) feedback.textContent = message;
    if (validId && production && trackedPage && !testMode && !settingsPage && storageAvailable && !preferences.excluded && preferences.consent === 'unset') {
      if (!banner) {
        banner = document.createElement('aside');
        banner.className = 'analytics-notice';
        banner.setAttribute('aria-label', 'アクセス解析の設定');
        banner.innerHTML = '<p>サイト改善のため、Google AnalyticsとCookieを使用して閲覧状況を計測してもよろしいですか。</p><div><button type="button" data-analytics-action="grant">同意する</button><button type="button" data-analytics-action="deny">同意しない</button><a href="./privacy.html">詳細・設定</a></div>';
        document.body.append(banner);
      }
    } else { banner?.remove(); banner = null; }
  }
  document.addEventListener('click', e => {
    const control = e.target.closest?.('[data-analytics-action]');
    if (control) {
      const action = control.getAttribute('data-analytics-action');
      if (action === 'grant') save({ consent: 'granted' });
      if (action === 'deny') save({ consent: 'denied' });
      if (action === 'exclude') save({ excluded: true });
      if (action === 'include') save({ excluded: false });
      return;
    }
    const target = e.target.closest?.('[data-analytics-event]');
    if (!target) return;
    const name = target.getAttribute('data-analytics-event');
    if (!['view_case_study', 'view_product_price', 'open_purchase_demo', 'view_landing_page'].includes(name)) return;
    event(name, { placement: target.getAttribute('data-analytics-placement') || 'content' });
  });
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking || scrollSent || disabled()) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (scrollSent || disabled()) return;
      const height = document.documentElement.scrollHeight;
      if (height > innerHeight && scrollY + innerHeight >= height * .9) {
        event('scroll', { percent_scrolled: 90 });
        scrollSent = true;
      }
    });
  }, { passive: true });
  window.addEventListener('storage', e => {
    if (e.key !== key && e.key !== null) return;
    preferences = readPreferences();
    applyPreferences();
  });
  window.addEventListener('pageshow', () => { preferences = readPreferences(); applyPreferences(); });
  window.LumieAnalytics = Object.freeze({
    // Called only for release navigation, never for a normal page transition.
    prepareUpdate(target) {
      try { sessionStorage.setItem(resumeKey, JSON.stringify({ target, at: Date.now(), pageViewSent, scrollSent })); } catch { /* Optional deduplication persistence. */ }
    }
  });
  start();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, { once: true });
  else render();
})();

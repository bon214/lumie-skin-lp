(() => {
  'use strict';
  const current = document.querySelector('meta[name="site-version"]')?.content;
  const validVersion = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
  if (!validVersion(current) || !/^https?:$/.test(location.protocol)) return;

  const base = new URL('./', location.href);
  const storageKey = 'lumie-update:' + location.pathname;
  let busy = false;
  let lastCheck = 0;
  let lastActivity = Date.now();
  let pending = null;
  let notice = null;
  let navigating = false;
  const readState = () => {
    try { return JSON.parse(sessionStorage.getItem(storageKey) || '{}'); }
    catch { return {}; }
  };
  const writeState = value => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(value)); } catch { /* Private browsing. */ }
  };
  const visible = () => document.visibilityState === 'visible';
  const interacting = () => {
    const active = document.activeElement;
    if (active?.matches('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return true;
    if (document.querySelector('header[data-menu-open="true"]')) return true;
    return [...document.querySelectorAll('[role="dialog"], dialog[open]')]
      .some(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
  };

  function showNotice() {
    if (notice || !document.body) return;
    notice = document.createElement('aside');
    notice.className = 'site-update-notice';
    notice.setAttribute('aria-label', 'サイトの更新');
    const message = document.createElement('p');
    message.setAttribute('role', 'status');
    message.textContent = '新しい内容を公開しました。操作が落ち着いたら自動で更新します。';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '今すぐ更新';
    button.addEventListener('click', () => reload(true));
    notice.append(message, button);
    document.body.append(notice);
  }

  function reload(manual = false) {
    if (!pending || navigating || !visible() || navigator.onLine === false) return;
    if (!manual && (interacting() || Date.now() - lastActivity < 6000)) return;
    const target = new URL(location.href);
    const previous = readState();
    const attempts = Array.isArray(previous.attempts)
      ? previous.attempts.filter(time => Number.isFinite(time) && Date.now() - time < 120000) : [];
    // A stale CDN response must never cause a reload loop, even without storage.
    if (!manual && (target.searchParams.get('_lumie_release') === pending || attempts.length >= 2)) return;
    target.searchParams.set('_lumie_release', pending);
    if (manual) target.searchParams.set('_lumie_retry', String(Date.now()));
    writeState({ version: pending, y: window.scrollY, at: Date.now(), attempts: [...attempts, Date.now()] });
    navigating = true;
    location.replace(target.href);
  }

  async function check(force = false) {
    if (busy || navigating || !visible() || navigator.onLine === false) return;
    if (!force && Date.now() - lastCheck < 10000) return;
    busy = true;
    lastCheck = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const get = async url => {
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal, credentials: 'same-origin' });
      if (!response.ok) throw new Error('Update is not available');
      return response;
    };
    try {
      const manifestURL = new URL('site-version.json', base);
      manifestURL.searchParams.set('_check', String(Date.now()));
      const latest = (await (await get(manifestURL)).json()).version;
      if (!validVersion(latest)) return;
      if (latest === current) {
        pending = null;
        notice?.remove();
        notice = null;
        return;
      }
      if (pending === latest) return;
      // Confirm the page and essential local assets are available before navigating.
      const pageURL = new URL(location.href);
      pageURL.hash = '';
      pageURL.searchParams.set('_lumie_release', latest);
      const response = await get(pageURL);
      if (!response.headers.get('content-type')?.includes('text/html')) return;
      const next = new DOMParser().parseFromString(await response.text(), 'text/html');
      if (next.querySelector('meta[name="site-version"]')?.content !== latest) return;
      const assetURLs = [...next.querySelectorAll('script[src], link[rel="stylesheet"][href]')]
        .map(el => new URL(el.getAttribute('src') || el.getAttribute('href'), pageURL))
        .filter(url => url.origin === location.origin);
      await Promise.all(assetURLs.map(async url => {
        const asset = await get(url);
        if (asset.headers.get('content-type')?.includes('text/html')) throw new Error('Missing asset');
        await asset.arrayBuffer();
      }));
      pending = latest;
      lastActivity = Date.now();
      showNotice();
    } catch {
      // Keep the working page on connection failures or incomplete publication.
    } finally {
      clearTimeout(timeout);
      busy = false;
    }
  }

  // Restore reading position once the asynchronous page renderer is ready.
  const saved = readState();
  if (saved.version === current && Number.isFinite(saved.y) && Date.now() - saved.at < 120000) {
    let cancelled = false;
    const cancel = () => { cancelled = true; };
    window.addEventListener('pointerdown', cancel, { once: true, passive: true });
    window.addEventListener('keydown', cancel, { once: true });
    window.addEventListener('wheel', cancel, { once: true, passive: true });
    const deadline = Date.now() + 10000;
    const restore = () => {
      if (cancelled || Date.now() > deadline) return;
      if (document.readyState === 'complete' && !document.querySelector('x-dc') && document.querySelector('footer')) {
        window.scrollTo({ top: saved.y, behavior: 'instant' });
        writeState({ attempts: saved.attempts });
      } else setTimeout(restore, 100);
    };
    restore();
  }

  ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(type => {
    window.addEventListener(type, () => { lastActivity = Date.now(); }, { passive: true });
  });
  document.addEventListener('visibilitychange', () => { if (visible()) check(true); });
  window.addEventListener('pageshow', event => { if (event.persisted) check(true); });
  window.addEventListener('online', () => check(true));
  window.addEventListener('focus', () => check());
  setInterval(() => check(), 60000);
  setInterval(() => reload(), 1000);
  check();
})();

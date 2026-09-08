const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '../site-update.js'), 'utf8');
const A = 'a'.repeat(40), B = 'b'.repeat(40);

function browser(options = {}) {
  let now = 1000000;
  let latest = options.latest ?? A;
  let menu = false, dialog = false;
  const calls = [], navigations = [], intervals = [], events = {}, notices = [], state = new Map();
  const flush = () => new Promise(resolve => setImmediate(resolve));
  const element = () => ({
    children: [], setAttribute() {}, addEventListener(type, fn) { this[type] = fn; },
    append(...els) { this.children.push(...els); }, remove() { this.removed = true; }
  });
  const document = {
    visibilityState: options.hidden ? 'hidden' : 'visible', readyState: 'complete',
    activeElement: { matches: () => !!options.input },
    querySelector(selector) {
      if (selector.startsWith('meta')) return { content: options.current ?? A };
      if (selector.startsWith('header')) return menu ? {} : null;
      if (selector === 'footer') return {};
      return null;
    },
    querySelectorAll: () => dialog ? [{ getClientRects: () => [1] }] : [],
    createElement: element, body: { append: el => notices.push(el) },
    addEventListener(type, fn) { events[type] = fn; }
  };
  const location = new URL(options.url || 'https://example.test/lp/?campaign=test#faq');
  location.replace = url => navigations.push(url);
  const window = { scrollY: 1200, addEventListener(type, fn) { events[type] = fn; }, scrollTo() {} };
  const reply = (data, type = 'application/json') => ({
    ok: true, headers: { get: () => type }, json: async () => data,
    text: async () => '<html></html>', arrayBuffer: async () => new ArrayBuffer(1)
  });
  const context = {
    URL, AbortController, document, window, location, navigator: { onLine: !options.offline },
    Date: { now: () => now }, getComputedStyle: () => ({ visibility: 'visible' }),
    sessionStorage: { getItem: key => state.get(key), setItem: (key, value) => state.set(key, value) },
    setTimeout: () => 1, clearTimeout() {},
    setInterval(fn, ms) { intervals.push({ fn, ms }); },
    DOMParser: class {
      parseFromString() { return {
        querySelector: () => ({ content: options.pageVersion ?? latest }),
        querySelectorAll: () => [{ getAttribute: () => './support.js?v=' + latest }]
      }; }
    },
    async fetch(url, init) {
      calls.push({ url: String(url), init });
      if (options.error) throw new Error('offline');
      if (String(url).includes('site-version.json')) return reply({ version: latest });
      if (String(url).includes('support.js')) return options.asset404 ? { ok: false } : reply({}, 'text/javascript');
      return reply({}, 'text/html');
    }
  };
  vm.runInNewContext(script, context);
  return { document, calls, navigations, notices, state, flush,
    setLatest(value) { latest = value; }, setMenu(value) { menu = value; }, setDialog(value) { dialog = value; },
    async event(type, data = {}) { await events[type]?.(data); await flush(); },
    async tick(ms) { now += ms; for (const item of intervals) if (item.ms <= ms || item.ms === 1000) await item.fn(); await flush(); }
  };
}

test('unchanged releases never reload', async () => {
  const b = browser(); await b.flush(); await b.tick(60000);
  assert.equal(b.navigations.length, 0); assert.equal(b.notices.length, 0);
  assert.equal(b.calls.length, 2); assert.equal(b.calls[0].init.cache, 'no-store');
});
test('available release reloads after idle period, preserving query, hash and reading position', async () => {
  const b = browser({ latest: B }); await b.flush();
  assert.equal(b.notices.length, 1); await b.tick(5000); assert.equal(b.navigations.length, 0);
  await b.tick(2000); assert.equal(b.navigations.length, 1);
  const url = new URL(b.navigations[0]);
  assert.equal(url.searchParams.get('campaign'), 'test'); assert.equal(url.hash, '#faq');
  assert.equal(url.searchParams.get('_lumie_release'), B);
  assert.equal(JSON.parse([...b.state.values()][0]).y, 1200);
});
test('menu and dialog defer automatic reload until closed', async () => {
  const b = browser({ latest: B }); b.setMenu(true); await b.flush(); await b.tick(7000);
  assert.equal(b.navigations.length, 0); b.setMenu(false); b.setDialog(true); await b.tick(1000);
  assert.equal(b.navigations.length, 0); b.setDialog(false); await b.tick(1000);
  assert.equal(b.navigations.length, 1);
});
test('recent scrolling and editable fields defer reload', async () => {
  const b = browser({ latest: B }); await b.flush(); await b.tick(5000); await b.event('scroll');
  await b.tick(2000); assert.equal(b.navigations.length, 0); await b.tick(6000);
  assert.equal(b.navigations.length, 1);
  const input = browser({ latest: B, input: true }); await input.flush(); await input.tick(7000);
  assert.equal(input.navigations.length, 0);
});
test('hidden tabs check upon return and never reload while hidden', async () => {
  const b = browser({ latest: B, hidden: true }); await b.flush(); assert.equal(b.calls.length, 0);
  b.document.visibilityState = 'visible'; await b.event('visibilitychange'); assert.equal(b.notices.length, 1);
  b.document.visibilityState = 'hidden'; await b.tick(7000); assert.equal(b.navigations.length, 0);
});
test('failed requests, invalid versions, stale HTML and missing assets keep the current page', async () => {
  for (const option of [{error: true}, {latest: 'invalid'}, {pageVersion: A}, {asset404: true}, {offline: true}]) {
    const b = browser({latest: B, ...option}); await b.flush(); await b.tick(7000);
    assert.equal(b.navigations.length, 0); assert.equal(b.notices.length, 0);
  }
});
test('stale cached HTML does not cause a repeated automatic navigation to the same release', async () => {
  const b = browser({latest: B, url: 'https://example.test/lp/?_lumie_release=' + B});
  await b.flush(); await b.tick(7000); assert.equal(b.navigations.length, 0);
  b.notices[0].children[1].click(); assert.equal(b.navigations.length, 1);
});
test('publication rollback to the displayed revision cancels pending reload', async () => {
  const b = browser({latest: B}); b.setMenu(true); await b.flush(); b.setLatest(A);
  await b.tick(60000); b.setMenu(false); await b.tick(7000);
  assert.equal(b.navigations.length, 0); assert.equal(b.notices[0].removed, true);
});
test('unbuilt local files safely skip update checks', async () => {
  const b = browser({current: '__LUMIE_RELEASE__'}); await b.flush(); assert.equal(b.calls.length, 0);
});

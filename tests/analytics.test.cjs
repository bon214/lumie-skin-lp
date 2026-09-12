const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../analytics.js'), 'utf8');
const key = 'lumie-skin:analytics-preferences:v1';
function run(options = {}) {
  const listeners = {}, scripts = [], banners = [];
  const local = options.local || new Map();
  const session = options.session || new Map();
  if (options.consent) local.set(key, JSON.stringify({consent: options.consent, excluded: !!options.excluded}));
  const storage = (map, broken) => ({getItem:k=>map.get(k)||null, setItem:(k,v)=>{if(broken)throw Error('blocked');map.set(k,v);},removeItem:k=>map.delete(k)});
  const location = new URL(options.url || 'https://bon214.github.io/lumie-skin-lp/');
  location.reload = () => {location.reloaded = true;};
  const fields = new Map();
  const document = {
    referrer: 'https://crowdworks.jp/public/jobs?email=private@example.test', readyState:'complete', cookie:'',
    documentElement:{scrollHeight:5000},
    querySelector:selector=>fields.get(selector)||null,
    createElement:()=>({setAttribute(){},remove(){this.removed=true;}}),
    head:{append:el=>scripts.push(el)},body:{append:el=>banners.push(el)},
    addEventListener:(type,fn)=>{listeners['doc:'+type]=fn;}
  };
  const context = {
    URL, Date, location, document, navigator:{webdriver:!!options.automation},
    localStorage:storage(local,options.storageBroken),sessionStorage:storage(session),
    history:{replaceState:(s,t,url)=>{location.href=url;}},
    innerHeight:900, scrollY:0, requestAnimationFrame:fn=>fn(),
    LUMIE_ANALYTICS_CONFIG:{measurementId:options.missingId?'':'G-TEST123456',origin:'https://bon214.github.io',basePath:'/lumie-skin-lp/',storageKey:key},
    addEventListener:(type,fn)=>{listeners[type]=fn;},
    __LUMIE_ANALYTICS_TEST__:!!options.testFlag
  };
  context.window = context;
  vm.runInNewContext(source,context);
  const fire=(event,attrs)=>listeners['doc:click']({target:{closest:selector=>selector==='[data-analytics-action]'&&event==='action'?{getAttribute:()=>attrs}:selector==='[data-analytics-event]'&&event==='event'?{getAttribute:k=>k==='data-analytics-event'?attrs:'hero'}:null}});
  return {context,local,session,scripts,banners,fields, action:a=>fire('action',a),click:a=>fire('event',a),
    commands:()=>Array.from(context.dataLayer||[],a=>Array.from(a)),
    events:()=>Array.from(context.dataLayer||[],a=>Array.from(a)).filter(a=>a[0]==='event'),
    scroll(y){context.scrollY=y;listeners.scroll();},
    storage(value){local.set(key,JSON.stringify(value));listeners.storage({key});},
    rerun(){vm.runInNewContext(source,context);}
  };
}
test('no Google loader or events before consent, after denial, or in unconfigured/preview/test contexts',()=>{
  for(const options of [{},{consent:'denied'},{consent:'granted',excluded:true},{consent:'granted',missingId:true},{consent:'granted',automation:true},{consent:'granted',testFlag:true},{consent:'granted',storageBroken:true},{consent:'granted',url:'http://localhost:8765/'},{consent:'granted',url:'https://bon214.github.io/other/'},{consent:'granted',url:'https://bon214.github.io/lumie-skin-lp/LUMIE%20SKIN%20LP.dc.html'},{consent:'granted',url:'https://bon214.github.io/lumie-skin-lp/privacy.html'}]){
    const b=run(options);b.click('view_product_price');b.scroll(4800);assert.equal(b.scripts.length,0,JSON.stringify(options));assert.equal(b.events().length,0);
  }
});
test('consent initializes once and emits exactly one page view',()=>{
  const b=run();assert.equal(b.banners.length,1);b.action('grant');b.rerun();b.action('grant');
  assert.equal(b.scripts.length,1);assert.equal(b.events().filter(e=>e[1]==='page_view').length,1);
  assert.equal(b.commands().find(e=>e[0]==='config')[2].send_page_view,false);
});
test('creator exclusion takes precedence, persists and blocks the first page view via opt-out link',()=>{
  const b=run({consent:'granted',url:'https://bon214.github.io/lumie-skin-lp/?analytics=off'});
  assert.equal(b.events().length,0);assert.equal(b.context.location.search,'');
  assert.equal(JSON.parse(b.local.get(key)).excluded,true);
  b.action('grant');assert.equal(b.events().length,0);
  const next=run({local:b.local});assert.equal(next.events().length,0);
});
test('cross-tab revocation prevents subsequent events and clears unsent commands',()=>{
  const b=run({consent:'granted'});assert.equal(b.events().length,1);
  b.storage({consent:'denied',excluded:false});b.click('view_product_price');b.scroll(4800);
  assert.equal(b.events().length,0);assert.equal(b.context['ga-disable-G-TEST123456'],true);
  b.storage({consent:'granted',excluded:false});assert.equal(b.context.location.reloaded,true);
});
test('URLs strip release and unknown query parameters but retain safe campaign attribution',()=>{
  const b=run({consent:'granted',url:'https://bon214.github.io/lumie-skin-lp/index.html?_lumie_release=abc&email=secret&utm_source=crowdworks&utm_medium=referral&utm_campaign=portfolio#price'});
  const data=b.events()[0][2];assert.equal(data.page_location,'https://bon214.github.io/lumie-skin-lp/?utm_source=crowdworks&utm_medium=referral&utm_campaign=portfolio');
  assert.equal(data.page_referrer,'https://crowdworks.jp/public/jobs');
});
test('release reload suppresses repeated page view and scroll once, but normal reloads count',()=>{
  const b=run({consent:'granted'});b.scroll(4200);assert.equal(b.events().filter(e=>e[1]==='scroll').length,1);
  const target='https://bon214.github.io/lumie-skin-lp/?_lumie_release=abc';b.context.LumieAnalytics.prepareUpdate(target);
  const next=run({local:b.local,session:b.session,url:target});next.scroll(4200);assert.equal(next.events().length,0);
  const normal=run({local:b.local,session:b.session,url:target});assert.equal(normal.events()[0][1],'page_view');
});
test('release token cannot suppress a different page view',()=>{
  const b=run({consent:'granted'});b.context.LumieAnalytics.prepareUpdate('https://bon214.github.io/lumie-skin-lp/?_lumie_release=abc');
  const next=run({local:b.local,session:b.session,url:'https://bon214.github.io/lumie-skin-lp/case-study.html'});assert.equal(next.events()[0][1],'page_view');
});
test('fixed event vocabulary and a single 90 percent scroll never record purchases',()=>{
  const b=run({consent:'granted'});b.click('view_case_study');b.click('open_purchase_demo');b.click('purchase');b.scroll(1000);b.scroll(4200);b.scroll(4300);
  assert.deepEqual(b.events().map(e=>e[1]),['page_view','view_case_study','open_purchase_demo','scroll']);
});
test('debugging never bypasses creator exclusion or consent',()=>{
  const b=run({url:'https://bon214.github.io/lumie-skin-lp/?analytics_debug=1',consent:'granted'});
  assert.equal(b.commands().find(e=>e[0]==='config')[2].debug_mode,true);
  const excluded=run({url:'https://bon214.github.io/lumie-skin-lp/?analytics_debug=1',consent:'granted',excluded:true});assert.equal(excluded.scripts.length,0);
});

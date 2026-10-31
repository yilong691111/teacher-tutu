const {test}=require('node:test'),assert=require('node:assert/strict');
const model=require('./report-model.js');let renderer;try{renderer=require('./report-renderer.js')}catch{renderer={};}
function element(tag='div'){return {tag,children:[],attrs:{},hidden:false,listeners:{},style:{},textContent:'',setAttribute(k,v){this.attrs[k]=v},append(...x){this.children.push(...x)},replaceChildren(...x){this.children=x},addEventListener(k,f){this.listeners[k]=f}};}
function render(reports,options={}){const list=element(),shares=[],doc={getElementById:id=>id==='report-list'?list:null,createElement:element};const site={settings:{brand:'塗塗'},...(reports===undefined?{}:{reports})};renderer.mount(site,{...options,document:doc,sharing:{mount:(data,options)=>shares.push({data,options})}});return {list,shares};}
function all(node){return [node,...node.children.flatMap(all)];}
test('public renderer retains every original article block and legacy anchor without authored HTML',()=>{const h=render(),nodes=all(h.list),r=model.reportsFor({})[0];for(const text of [r.title,r.label,r.subtitle,r.summary,r.body,r.closing,...r.sections.flatMap(x=>[x.label,x.title,x.body])])assert.ok(nodes.some(n=>n.textContent===text),text);assert.ok(nodes.some(n=>n.id==='grade7-idioms'));assert.equal(h.shares.length,1);});
test('multiple reports render only published records in order with separate canonical share payloads',()=>{const h=render([{id:'first',title:'<img src=x onerror=alert(1)>',body:'文字',published:true},{id:'secret',title:'隱藏',body:'隱藏',published:false},{id:'last',title:'最後一篇',summary:'摘要',body:'內文',published:true}]);assert.equal(h.list.children.filter(x=>x.tag==='article').length,2);assert.equal(h.shares[0].data.title,'<img src=x onerror=alert(1)>｜塗塗');assert.equal(h.shares[0].data.url,'https://yilong691111.github.io/teacher-tutu/#report-first');assert.equal(h.shares[1].data.url,'https://yilong691111.github.io/teacher-tutu/#report-last');assert.notEqual(h.shares[0].options.elements.share,h.shares[1].options.elements.share);assert.ok(all(h.list).some(x=>x.textContent==='<img src=x onerror=alert(1)>'));assert.ok(!all(h.list).some(x=>x.tag==='img'));});
test('empty or entirely hidden reports show an empty state without restoring the old report',()=>{for(const records of [[],[{id:'a',title:'舊報導',body:'內文',published:false}]]){const h=render(records);assert.equal(h.shares.length,0);assert.ok(all(h.list).some(x=>x.textContent.includes('目前沒有公開')));assert.ok(!all(h.list).some(x=>x.textContent.includes('聊天有梗')));}});
test('unsafe buttons are omitted even from unvalidated page data',()=>{const h=render([{id:'a',title:'文章',body:'正文',buttonText:'危險',buttonLink:'javascript:alert(1)'}]);assert.ok(!all(h.list).some(x=>x.href==='javascript:alert(1)'));});

test('report illustrations expose original images, alternative text and literal captions, omitting unsafe sources',()=>{
 const h=render([{id:'kindness',title:'善良日',body:'正文',images:[{image:'assets/works/kindness-cover.webp',alt:'孩子擁抱地球',caption:'<b>分享善良</b>'},{image:'javascript:alert(1)',alt:'危險'}]}]);
 const nodes=all(h.list),images=nodes.filter(x=>x.tag==='img');assert.equal(images.length,1);assert.equal(images[0].src,'assets/works/kindness-cover.webp');assert.equal(images[0].alt,'孩子擁抱地球');assert.equal(images[0].loading,'lazy');assert.ok(nodes.some(x=>x.tag==='figcaption'&&x.textContent==='<b>分享善良</b>'));
});

const twoReports=[{id:'grade7-idioms',title:'聊天有梗，成語也有戲。',body:'成語全文'},{id:'world-kindness-day-20261113',title:'把善良放進聊天，讓溫暖走進日常。',body:'善良日全文'}];
test('pagination displays exactly one report and lets readers switch pages without losing either article',()=>{
 const location={hash:''},h=render(twoReports,{location}),nodes=all(h.list),cards=nodes.filter(n=>n.tag==='article'&&n.className==='report-article');
 assert.deepEqual(cards.map(c=>c.hidden),[false,true]);
 const second=nodes.find(n=>n.tag==='button'&&n.textContent==='第 2 頁｜把善良放進聊天，讓溫暖走進日常。');assert.ok(second);second.listeners.click();
 assert.deepEqual(cards.map(c=>c.hidden),[true,false]);assert.equal(location.hash,'#report-world-kindness-day-20261113');assert.equal(second.attrs['aria-current'],'page');
 nodes.find(n=>n.tag==='button'&&n.textContent==='第 1 頁｜聊天有梗，成語也有戲。').listeners.click();assert.deepEqual(cards.map(c=>c.hidden),[false,true]);assert.equal(location.hash,'#grade7-idioms');
});
test('direct report links and history changes select the matching page while the general report link starts at page one',()=>{
 const location={hash:'#report-world-kindness-day-20261113'},events={},h=render(twoReports,{location,eventTarget:{addEventListener:(k,f)=>events[k]=f}}),cards=all(h.list).filter(n=>n.className==='report-article');
 assert.deepEqual(cards.map(c=>c.hidden),[true,false]);
 location.hash='#grade7-idioms';events.hashchange();assert.deepEqual(cards.map(c=>c.hidden),[false,true]);
 location.hash='#report-world-kindness-day-20261113';events.hashchange();assert.deepEqual(cards.map(c=>c.hidden),[true,false]);
 location.hash='#news';events.hashchange();assert.deepEqual(cards.map(c=>c.hidden),[true,false]);
 location.hash='#idiom-story';events.hashchange();assert.deepEqual(cards.map(c=>c.hidden),[false,true]);
});
test('hidden report artwork is omitted from the public article without deleting its text or original image data',()=>{
 const report={...twoReports[1],showImages:false,images:[{image:'assets/works/kindness-cover.webp',alt:'原圖',caption:'原始文案'}]},before=structuredClone(report),h=render([report]);
 assert.equal(all(h.list).filter(n=>n.tag==='img').length,0);assert.ok(all(h.list).some(n=>n.textContent==='善良日全文'));assert.deepEqual(report,before);
});

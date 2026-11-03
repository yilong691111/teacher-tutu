const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const cms=require('./github-cms.js');
const site=()=>JSON.parse(fs.readFileSync(__dirname+'/data/site.json','utf8'));
const block=(patch={})=>({text:'介紹內容',fontSize:18,effect:'shadow',underline:'wavy',background:'#fff4cc',linkText:'看看貼圖',url:'https://store.line.me/stickershop/author/5947333/zh-Hant',...patch});
test('三張首頁內文的特效和超連結均在發布前驗證',()=>{
 for(const patch of [{fontSize:0},{effect:'url(x)'},{underline:'bad'},{background:'red;display:none'},{url:'javascript:alert(1)'},{url:'https://example.test',linkText:''}]){
  const d=site();d.settings.hero2TextBlocks=[block(patch)];assert.throws(()=>cms.validateData(d),/首頁/);
 }
});
test('多段內文、品牌短句和樣式可一起匯出再匯入',()=>{
 const d=site();d.settings.homepageTagline='把快樂帶進每一天';d.settings.heroTextBlocks=[block(),block({text:'第二段',effect:'bold',underline:'highlight',url:'',linkText:''})];d.settings.hero3TextBlocks=[block({text:'第三張的內容'})];
 assert.deepEqual(cms.parseData(cms.serializeData(d)).settings,d.settings);
});
test('舊資料轉為第一段內文，三張段落互不覆蓋',()=>{
 const rich=require('./homepage-rich-text.js');assert.equal(rich.blocksFor({},2,'原本介紹')[0].text,'原本介紹');
 const s={heroTextBlocks:[block({text:'第一張'})],hero2TextBlocks:[block({text:'第二張'})],hero3TextBlocks:[]};assert.equal(rich.blocksFor(s,1,'舊')[0].text,'第一張');assert.equal(rich.blocksFor(s,2,'舊')[0].text,'第二張');assert.deepEqual(rich.blocksFor(s,3,'舊'),[]);
});
test('自動暫存保留多段內文與品牌短句，其他品牌欄位仍不開放',()=>{
 const f=require('./form-drafts.js'),json=JSON.stringify([block()]);const v=f.sanitize('settings-form',{'settings-heroTextBlocks':json,'settings-tagline':'品牌短句','settings-brand':'不開放'});
 assert.equal(v['settings-heroTextBlocks'],json);assert.equal(v['settings-tagline'],'品牌短句');assert.equal(v['settings-brand'],undefined);
});
test('預覽與官網共用安全的文字、背景、底線與連結渲染',()=>{
 const rich=require('./homepage-rich-text.js');
 function node(tag){return {tag,children:[],classList:{items:[],add(v){this.items.push(v)}},style:{setProperty(k,v){this[k]=v}},append(v){this.children.push(v)},replaceChildren(){this.children=[]}};}
 const doc={createElement:node},container=node('div');
 rich.render(doc,container,[block({text:'<img src=x onerror=alert(1)>',fontSize:24,effect:'glow',underline:'double'})]);
 const rendered=container.children[0];assert.equal(rendered.style['--copy-font-size'],'24px');assert.equal(rendered.style.backgroundColor,'#fff4cc');assert.ok(rendered.classList.items.includes('copy-effect-glow'));assert.equal(rendered.children[0].textContent,'<img src=x onerror=alert(1)>');assert.equal(rendered.children[0].className,'homepage-text-content copy-underline-double');assert.equal(rendered.children[1].tag,'a');assert.equal(rendered.children[1].rel,'noopener noreferrer');
 rich.render(doc,container,[block({url:'javascript:alert(1)'})]);assert.equal(container.children[0].children.length,1);
});
test('完整首頁預覽帶有版本參數，避免瀏覽器沿用舊的純文字版頁面',()=>{
 const vm=require('node:vm'),source=fs.readFileSync(__dirname+'/admin.js','utf8').match(/function previewDraft\(\)\{[^\n]+\}/)[0];let opened;
 vm.runInNewContext(source+';previewDraft();',{saveLocal(){},window:{TutuFormDrafts:{allowPreview:()=>true},open:url=>opened=url}});
 const url=new URL(opened,'https://example.test/');assert.equal(url.searchParams.get('draft'),'1');assert.ok(url.searchParams.get('v'));
});

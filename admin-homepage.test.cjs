const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const model=require('./homepage-text.js'),content=require('./content-models.js');
function harness(compress){
 const nodes=new Map(),events=[],messages=[];let locked=false;
 const el=id=>{if(!nodes.has(id))nodes.set(id,{id,value:'',files:[],handlers:{},style:{setProperty(){}},addEventListener(k,f){this.handlers[k]=f},dispatchEvent(){events.push(id)}});return nodes.get(id);};
 for(const slide of [1,2,3]){const p=slide===1?'hero':'hero'+slide;el('settings-'+p+'Image').value=model.values({},slide).heroImage;el('settings-'+p+'Description').value='介紹 '+slide;}
 const settings={heroIntroTitle:'保留原標題',brand:'塗塗老師'};
 const context={window:{TutuHomepageText:model,TutuContent:content},document:{getElementById:el},$:s=>el(s.slice(1)),site:{settings},Event:class{},checkFestivalFile(){},compressImage:compress,beginEditorSave(){locked=true;return ()=>locked=false},toast:m=>messages.push(m)};
 vm.runInNewContext(fs.readFileSync(__dirname+'/admin-homepage.js','utf8'),context);
 return {el,events,messages,settings,get locked(){return locked}};
}
test('首頁圖片處理期間鎖定表單，成功後只修改選定輪播的待儲存圖片',async()=>{
 let resolve;const h=harness(()=>new Promise(r=>resolve=r));h.el('homepage-2-file').files=[{name:'new.png'}];const p=h.el('homepage-2-file').handlers.change();
 assert.equal(h.locked,true);resolve('data:image/png;base64,AAAA');await p;
 assert.equal(h.locked,false);assert.equal(h.el('settings-hero2Image').value,'data:image/png;base64,AAAA');assert.equal(h.el('settings-heroImage').value,'assets/tutu-hero.webp');assert.equal(h.settings.hero2Image,undefined);assert.ok(h.events.includes('settings-hero2Image'));
});
test('圖片處理失敗保留原圖並解除鎖定',async()=>{
 const h=harness(()=>Promise.reject(new Error('圖片讀取失敗')));h.el('homepage-3-file').files=[{name:'bad.png'}];await h.el('homepage-3-file').handlers.change();
 assert.equal(h.locked,false);assert.equal(h.el('settings-hero3Image').value,'assets/works/002.webp');assert.match(h.el('homepage-3-status').textContent,/原圖片已保留/);assert.deepEqual(h.messages,['圖片讀取失敗']);
});
test('選素材與取消換圖只影響當前首頁介紹',()=>{
 const h=harness();h.el('homepage-1-media').value='assets/works/009.webp';h.el('homepage-1-media').handlers.change();assert.equal(h.el('settings-heroImage').value,'assets/works/009.webp');
 h.el('homepage-1-reset').onclick();assert.equal(h.el('settings-heroImage').value,'assets/tutu-hero.webp');assert.equal(h.el('settings-hero2Image').value,'assets/tutu-original.webp');assert.equal(h.settings.heroIntroTitle,'保留原標題');
});

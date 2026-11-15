const {test}=require('node:test'),assert=require('node:assert/strict');
const cms=require('./github-cms.js');
const version='20261115-christmas-works-v2',id='line-product-37513322';
const old={id,image:'assets/works/festival-christmas-20261225.png',imageAlt:'舊圖說',description:'12／25 聖誕節，和塗塗一起送上聖誕快樂，用藍色蠟筆畫傳遞平安與溫暖。',workIds:[],coverWorkId:'',published:true};
function fixture(){
 const work={id:'christmas-20261115-01',image:'assets/works/christmas-20261115-p01.png',title:'有你最暖'};
 const before={settings:{brand:'塗塗'},gallery:[{id:'custom',title:'保留作品'}],festivals:[old],news:[{id:'draft'}],mediaLibrary:[]};
 const remote={...structuredClone(before),christmasWorksRevision:version,gallery:[work],festivals:[{...old,image:work.image,imageAlt:'新圖說',description:'最新聖誕作品',coverWorkId:work.id,workIds:[work.id]}],mediaLibrary:[{image:work.image,name:work.title}]};
 return {before,remote};
}
test('latest Christmas artwork reaches old drafts while existing content and later edits survive',()=>{
 const {before,remote}=fixture(),original=structuredClone(before),result=cms.hydrateDraft(before,remote);
 assert.deepEqual(result.gallery.map(w=>w.id),['custom','christmas-20261115-01']);
 assert.equal(result.festivals[0].image,'assets/works/christmas-20261115-p01.png');
 assert.deepEqual(result.festivals[0].workIds,['christmas-20261115-01']);assert.equal(result.festivals[0].description,'最新聖誕作品');
 assert.equal(result.mediaLibrary.length,1);assert.deepEqual(result.news,before.news);assert.deepEqual(before,original);
 result.gallery=result.gallery.filter(w=>w.id==='custom');result.festivals=[];result.mediaLibrary=[];
 assert.deepEqual(cms.hydrateDraft(result,remote),result);
});
test('an absent Christmas festival is added once and custom covers or descriptions are retained',()=>{
 const {before,remote}=fixture();before.festivals=[];
 const added=cms.hydrateDraft(before,remote);assert.equal(added.festivals.length,1);assert.equal(added.festivals[0].id,id);
 const customized={...before,festivals:[{...old,image:'assets/works/custom.png',description:'我的介紹',workIds:['custom']}],mediaLibrary:[{image:remote.gallery[0].image,name:'自訂素材名',deleted:true}]};
 const result=cms.hydrateDraft(customized,remote);
 assert.deepEqual(result.festivals,customized.festivals);assert.deepEqual(result.mediaLibrary,customized.mediaLibrary);
});
test('Christmas product tags reach old drafts without overwriting owner tag choices',()=>{
 const {before,remote}=fixture(),tags={topic:'festive',characters:['藍寶','桃寶'],holidays:['聖誕節'],situations:['祝福']};
 before.lineProducts=[{id:'37513322',title:'保留商品名稱'},{id:'other',catalogTags:{topic:'daily'}}];
 remote.lineProducts=[{id:'37513322',catalogTags:tags}];
 const result=cms.hydrateDraft(before,remote);
 assert.deepEqual(result.lineProducts[0].catalogTags,tags);assert.equal(result.lineProducts[0].title,'保留商品名稱');
 before.lineProducts[0].catalogTags={topic:'daily',characters:['自訂角色'],holidays:[],situations:[]};
 assert.deepEqual(cms.hydrateDraft(before,remote).lineProducts[0].catalogTags,before.lineProducts[0].catalogTags);
});

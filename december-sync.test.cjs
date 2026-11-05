const {test}=require('node:test'),assert=require('node:assert/strict');
const cms=require('./github-cms.js'),model=require('./festival-model.js');
const christmasImage='assets/works/festival-christmas-20261225.png',newyearImage='assets/works/festival-newyear-20261231.png';
function fixture(){
 const c={id:'line-product-37513322',title:'塗塗的日常',subtitle:'12／25 聖誕節',holidayName:'聖誕節',eventDate:'2026-12-25',image:'assets/works/christmas-920161679.png',imageAlt:'聖誕祝福',coverWorkId:'christmas-920161679',workIds:['christmas-920161679'],published:true};
 const before={settings:{brand:'塗塗'},gallery:[],news:[{id:'n',title:'未發布公告'}],festivals:[c],mediaLibrary:[]};
 const published={...structuredClone(before),festivalRevision:'20261105-december-single-v1',festivals:[{...c,image:christmasImage,imageAlt:'聖誕快樂',coverWorkId:'',workIds:[]},{...c,id:'line-product-37421102',subtitle:'12／31 跨年',holidayName:'跨年',eventDate:'2026-12-31',image:newyearImage,imageAlt:'迎接 2027',coverWorkId:'',workIds:[]}],mediaLibrary:[{image:christmasImage,name:'12／25 聖誕節',category:'節慶',alt:'聖誕快樂'},{image:newyearImage,name:'12／31 跨年',category:'節慶',alt:'迎接 2027'}]};
 return {before,published};
}
test('older admin drafts receive one independent image for each December festival and two saved materials',()=>{
 const {before,published}=fixture(),copy=structuredClone(before);before.festivals[0].workIds=['christmas-920161674','christmas-920161679'];
 const result=cms.hydrateDraft(before,published);assert.equal(result.festivals.length,2);assert.equal(result.mediaLibrary.length,2);
 for(const f of result.festivals)assert.equal(model.frames([f],result.gallery).length,1);
 assert.deepEqual(result.news,before.news);assert.equal(before.festivalRevision,undefined);assert.deepEqual(before.mediaLibrary,copy.mediaLibrary);
 assert.equal(result.festivals[1].eventDate,'2026-12-31');assert.equal(result.festivals[0].coverWorkId,'');
 result.mediaLibrary[0].name='草稿修改';assert.equal(published.mediaLibrary[0].name,'12／25 聖誕節');
});
test('custom cover art, descriptions, hidden state and other festival edits survive synchronization',()=>{
 const {before,published}=fixture();Object.assign(before.festivals[0],{image:'assets/works/custom.png',imageAlt:'自訂封面',coverWorkId:'my-work',workIds:['my-work'],description:'我的介紹',published:false});
 const result=cms.hydrateDraft(before,published);assert.deepEqual(result.festivals[0],before.festivals[0]);
});
test('the migration runs once and later deletions of festivals or materials stay deleted',()=>{
 const {before,published}=fixture(),first=cms.hydrateDraft(before,published);first.festivals.pop();first.mediaLibrary=[];
 assert.deepEqual(cms.hydrateDraft(first,published),first);
});
test('existing custom media metadata and library deletion markers are preserved',()=>{
 const {before,published}=fixture();before.mediaLibrary=[{...published.mediaLibrary[0],name:'我自己的素材名稱',deleted:true}];
 const result=cms.hydrateDraft(before,published);assert.equal(result.mediaLibrary.length,2);assert.equal(result.mediaLibrary[0].deleted,true);assert.equal(result.mediaLibrary[0].name,'我自己的素材名稱');
});
test('an intentionally empty festival collection stays empty; unpublished editions do not trigger migration',()=>{
 const {before,published}=fixture();before.festivals=[];assert.deepEqual(cms.hydrateDraft(before,published).festivals,[]);
 const unrelated=structuredClone(published);delete unrelated.festivalRevision;assert.deepEqual(cms.hydrateDraft(before,unrelated),before);assert.equal(cms.hydrateDraft(null,published),null);
});

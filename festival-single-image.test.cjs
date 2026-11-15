const {test}=require('node:test'),assert=require('node:assert/strict');
const cms=require('./github-cms.js'),m=require('./festival-model.js');
const revision='20261115-festival-single-image-v1';
function fixture(){
 const gallery=[{id:'christmas-20261115-01',image:'assets/works/christmas-20261115-p01.png',published:true},{id:'christmas-20261115-02',image:'assets/works/christmas-20261115-p02.png',published:true},{id:'custom',image:'assets/works/custom.png',published:true}];
 const local={settings:{},news:[{id:'unfinished'}],gallery,mediaLibrary:gallery.map(w=>({image:w.image,name:w.id})),festivals:[{id:'christmas',image:'assets/works/old.png',imageAlt:'封面',coverWorkId:gallery[0].id,workIds:gallery.map(w=>w.id),published:true},{id:'newyear',image:'assets/works/newyear.png',workIds:['custom'],published:true}]};
 return {local,remote:{...structuredClone(local),festivalSingleImageRevision:revision}};
}
test('all festival drafts retain their current cover as one independent image and lose extra Christmas materials',()=>{
 const {local,remote}=fixture(),before=structuredClone(local),result=cms.hydrateDraft(local,remote);
 assert.equal(result.festivals[0].image,'assets/works/christmas-20261115-p01.png');
 for(const f of result.festivals){assert.deepEqual(f.workIds,[]);assert.equal(f.coverWorkId,'');assert.equal(m.frames([f],result.gallery).length,1)}
 assert.deepEqual(result.gallery.map(w=>w.id),['christmas-20261115-01','custom']);
 assert.deepEqual(result.mediaLibrary.map(w=>w.name),['christmas-20261115-01','custom']);
 assert.deepEqual(result.news,local.news);assert.deepEqual(local,before);
 result.festivals.pop();assert.deepEqual(cms.hydrateDraft(result,remote),result);
});
test('a custom chosen cover and hidden state survive; removed festival collections stay empty',()=>{
 const {local,remote}=fixture();local.festivals=[{...local.festivals[0],coverWorkId:'christmas-20261115-02',published:false,description:'我的介紹'}];
 const result=cms.hydrateDraft(local,remote);
 assert.equal(result.festivals[0].image,'assets/works/christmas-20261115-p02.png');assert.equal(result.festivals[0].published,false);assert.equal(result.festivals[0].description,'我的介紹');
 assert.ok(result.gallery.some(w=>w.id==='christmas-20261115-02'));
 assert.deepEqual(cms.hydrateDraft({...local,festivals:[]},remote).festivals,[]);
});

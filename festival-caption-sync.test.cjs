const {test}=require('node:test'),assert=require('node:assert/strict');
const cms=require('./github-cms.js');
const old={id:'line-product-37354432',image:'assets/line-product-37354432.png',imageAlt:'塗塗的日常 萬聖節篇',description:'',published:true,workIds:[]};
const released=()=>({festivalCaptionRevision:'20261106-image-copy-v1',festivals:[{...old,imageAlt:'穿黑色披風、拿南瓜桶與糖果的塗塗。',description:'跟著塗塗一起討糖！'}]});
test('published festival captions reach old drafts while preserving other edits and later removals',()=>{
 const local={festivals:[{...old,subtitle:'我的系列',published:false}],news:[{id:'draft'}]};
 const before=structuredClone(local),result=cms.hydrateDraft(local,released());
 assert.equal(result.festivals[0].description,'跟著塗塗一起討糖！');
 assert.equal(result.festivals[0].imageAlt,'穿黑色披風、拿南瓜桶與糖果的塗塗。');
 assert.equal(result.festivals[0].subtitle,'我的系列');assert.equal(result.festivals[0].published,false);
 assert.deepEqual(result.news,local.news);assert.deepEqual(local,before);
 result.festivals=[];assert.deepEqual(cms.hydrateDraft(result,released()),result);
});
test('custom images and captions are not replaced by the caption release',()=>{
 for(const edit of [{description:'自己的介紹',imageAlt:'自己的說明'},{image:'assets/custom.png'}]){
  const local={festivals:[{...old,...edit}]},result=cms.hydrateDraft(local,released());
  assert.deepEqual(result.festivals,local.festivals);
 }
});
test('caption release never restores a removed festival or changes unrelated drafts',()=>{
 const local={festivals:[]};assert.deepEqual(cms.hydrateDraft(local,released()).festivals,[]);
 const unknown={...released(),festivalCaptionRevision:'unrecognized'};
 assert.deepEqual(cms.hydrateDraft({festivals:[old]},unknown),{festivals:[old]});
});

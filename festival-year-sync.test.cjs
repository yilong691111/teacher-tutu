const {test}=require('node:test'),assert=require('node:assert/strict');
const cms=require('./github-cms.js'),model=require('./festival-model.js');
const before={id:'legacy-festival',holidayName:'羊年賀歲祝福',eventDate:'2007-02-04',description:'原介紹'};
const published={festivalDateRevision:'20261106-year-order-v1',festivals:[{...before,eventDate:'2027-02-06'}]};
test('corrected sheep-year date follows 2026 events in both the editor and public sequence',()=>{
 const local={festivals:[{...before,description:'未發布介紹'}, {id:'christmas',holidayName:'聖誕節',eventDate:'2026-12-25'}, {id:'newyear',holidayName:'跨年',eventDate:'2026-12-31'}],news:[{id:'draft'}]};
 const copy=structuredClone(local),result=cms.hydrateDraft(local,published);
 assert.equal(result.festivals[0].eventDate,'2027-02-06');
 assert.deepEqual(model.select(result.festivals).map(f=>f.id),['christmas','newyear','legacy-festival']);
 assert.equal(result.festivals[0].description,'未發布介紹');assert.deepEqual(result.news,local.news);assert.deepEqual(local,copy);
});
test('date synchronization preserves custom dates, removed series and later owner edits',()=>{
 for(const festivals of [[],[{...before,eventDate:'2027-02-01'}]]){
  assert.deepEqual(cms.hydrateDraft({festivals},published).festivals,festivals);
 }
 const updated=cms.hydrateDraft({festivals:[before]},published);
 updated.festivals[0].eventDate='2007-02-04';assert.deepEqual(cms.hydrateDraft(updated,published),updated);
 assert.deepEqual(cms.hydrateDraft({festivals:[before]}, {...published,festivalDateRevision:'other'}),{festivals:[before]});
});

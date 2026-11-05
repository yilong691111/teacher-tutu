const {test}=require('node:test');
const assert=require('node:assert/strict');
const cms=require('./github-cms.js');
const revision='20261105-line-christmas-v1';
const christmas={id:'37513322',title:'聖誕節篇',category:'其他節慶',description:'',checkedDate:'2026-10-29'};
const published=()=>({settings:{brand:'塗塗'},gallery:[{id:'old-work',title:'原作品'},{id:'christmas-920161673',title:'聖誕作品'}],news:[],lineProducts:[{id:'37744779',title:'小藍姐姐療癒篇'},{...christmas,category:'聖誕節',description:'聖誕祝福',checkedDate:'2026-11-05'}],festivals:[{id:'old-festival'},{id:'line-product-37513322',eventDate:'2026-12-25'}],catalogRevision:revision});
const old=()=>({settings:{brand:'塗塗'},gallery:[{id:'old-work',title:'原作品'}],news:[],lineProducts:[{...christmas}],festivals:[{id:'old-festival'}]});
test('an unchanged old catalog becomes the published edition with Christmas works and festival',()=>{
 const local=old(),snapshot=structuredClone(local),p=published();
 const result=cms.resolveDraft(local,{data:p,baseBlob:'new'},{baseBlob:'old'});
 assert.deepEqual(result.data,p);assert.equal(result.dirty,false);assert.deepEqual(local,snapshot);
 result.data.gallery[1].title='changed';assert.equal(p.gallery[1].title,'聖誕作品');
});
test('catalog additions preserve custom text, hidden items, original order and unrelated draft edits',()=>{
 const local=old();local.news=[{id:'n',title:'未發布公告'}];local.lineProducts[0].title='自訂聖誕標題';local.lineProducts[0].description='自訂介紹';local.lineProducts[0].published=false;
 local.gallery[0].title='編輯中的作品';local.festivals[0].eventDate='2026-11-13';
 const result=cms.hydrateDraft(local,published());
 assert.deepEqual(result.lineProducts.map(p=>p.id),['37744779','37513322']);
 assert.equal(result.lineProducts[1].title,'自訂聖誕標題');assert.equal(result.lineProducts[1].description,'自訂介紹');assert.equal(result.lineProducts[1].published,false);
 assert.equal(result.gallery[0].title,'編輯中的作品');assert.deepEqual(result.news,local.news);assert.equal(result.festivals[0].eventDate,'2026-11-13');
 assert.equal(result.festivals[1].published,false);
});
test('new festivals fall back to their cover when a draft intentionally removed its gallery',()=>{
 const local=old();local.gallery=[];const p=published();Object.assign(p.festivals[1],{image:'assets/works/christmas-920161673.png',coverWorkId:'christmas-920161673',workIds:['christmas-920161673']});
 const result=cms.hydrateDraft(local,p),f=result.festivals[1];assert.equal(f.coverWorkId,'');assert.deepEqual(f.workIds,[]);assert.equal(f.image,p.festivals[1].image);
});
test('intentional empty collections and later deletions are not repopulated',()=>{
 const local=old();local.lineProducts=[];local.gallery=[];local.festivals=[];
 const result=cms.hydrateDraft(local,published());for(const key of ['lineProducts','gallery','festivals'])assert.deepEqual(result[key],[]);
 const upgraded=cms.hydrateDraft(old(),published());upgraded.lineProducts.shift();upgraded.gallery.pop();upgraded.festivals.pop();
 assert.deepEqual(cms.hydrateDraft(upgraded,published()),upgraded);
});
test('already edited introduced records are never overwritten or duplicated',()=>{
 const local=old();local.lineProducts.unshift({id:'37744779',title:'自訂新作品',published:false});local.gallery.push({id:'christmas-920161673',title:'自訂作品'});local.festivals.push({id:'line-product-37513322',eventDate:'2027-12-25'});
 const result=cms.hydrateDraft(local,published());assert.equal(result.lineProducts.length,2);assert.equal(result.lineProducts[0].title,'自訂新作品');assert.equal(result.lineProducts[0].published,false);assert.equal(result.gallery[1].title,'自訂作品');assert.equal(result.festivals[1].eventDate,'2027-12-25');
});
test('missing legacy collections hydrate safely while other releases do not trigger the upgrade',()=>{
 const local=old();delete local.lineProducts;delete local.festivals;
 const result=cms.hydrateDraft(local,published());assert.deepEqual(result.lineProducts,published().lineProducts);assert.deepEqual(result.festivals,published().festivals);
 const unrelated=published();delete unrelated.catalogRevision;assert.deepEqual(cms.hydrateDraft(local,unrelated),local);assert.equal(cms.hydrateDraft(null,published()),null);
});

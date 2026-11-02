const {test}=require('node:test');
const assert=require('node:assert/strict');
const festivals=require('./festival-model.js');
const p={id:'123',title:'聖誕快樂',description:'一起過聖誕節',image:'assets/works/009.webp',url:'https://store.line.me/stickershop/product/123/zh-Hant',published:true};
test('LINE 貼圖同步至可播放的節慶系列，保留其他系列',()=>{
 const site={};const next=festivals.syncProduct(site,p,{enabled:true,holidayName:'聖誕節',eventDate:'2026-12-25'});
 assert.equal(next.length,2);assert.equal(site.festivals,undefined);
 const f=next.find(f=>f.id==='line-product-123');assert.equal(f.image,p.image);assert.equal(f.buttonLink,p.url);assert.equal(f.description,p.description);
 assert.equal(festivals.frames([f],[]).length,1);festivals.validate({festivals:next});
});
test('重複儲存不新增重複系列；換圖與隱藏同步更新',()=>{
 const first=festivals.syncProduct({festivals:[]},p,{enabled:true,holidayName:'聖誕節',eventDate:'2026-12-25'});
 const next=festivals.syncProduct({festivals:first},{...p,image:'assets/works/010.webp',published:false},{enabled:true,holidayName:'聖誕節',eventDate:'2026-12-25'});
 assert.equal(next.length,1);assert.equal(next[0].image,'assets/works/010.webp');assert.equal(next[0].published,false);
});
test('取消同步只移除這張貼圖的連動項目',()=>{
 const base=festivals.festivalsFor({});const own=festivals.syncProduct({festivals:base},p,{enabled:true,holidayName:'聖誕節',eventDate:'2026-12-25'});
 assert.deepEqual(festivals.syncProduct({festivals:own},p,{enabled:false}),base);
});
test('錯誤節慶日期不更動原始資料',()=>{
 const site={festivals:[]};assert.throws(()=>festivals.syncProduct(site,p,{enabled:true,holidayName:'聖誕節',eventDate:'2026-02-30'}),/日期/);assert.deepEqual(site,{festivals:[]});
});
test('同步長名稱與介紹時遵守節慶欄位限制',()=>{
 const next=festivals.syncProduct({festivals:[]},{...p,title:'長'.repeat(150),description:'文'.repeat(3000)},{enabled:true,holidayName:'聖誕節',eventDate:'2026-12-25'});
 festivals.validate({festivals:next});assert.equal(next[0].title.length,90);assert.equal(next[0].description.length,1500);
});

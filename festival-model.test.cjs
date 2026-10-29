const {test}=require('node:test');
const assert=require('node:assert/strict');
const api=require('./festival-model.js');
const sample=(id,date,name='節日')=>({id,eventDate:date,holidayName:name,title:'塗塗的日常',subtitle:name,description:'祝福',tags:'快樂',image:'assets/works/031.webp',imageAlt:'作品',buttonText:'看作品',buttonLink:'#gallery',workIds:[],published:true});
test('legacy festival preserves owner settings while an explicit empty list remains empty',()=>{
 const site={settings:{festivalImage:'assets/works/031.webp',festivalSubtitle:'羊年賀歲祝福',festivalTitle:'塗塗的日常'}};
 const a=api.festivalsFor(site);assert.equal(a[0].id,'legacy-festival');assert.equal(a[0].image,'assets/works/031.webp');assert.equal(a[0].eventDate,'');assert.deepEqual(api.festivalsFor({...site,festivals:[]}),[]);
 a[0].title='changed';assert.equal(site.settings.festivalTitle,'塗塗的日常');
});
test('festival validation rejects impossible dates and accepts leap day only in leap years',()=>{
 for(const date of ['2027-02-29','2026-04-31','2026-13-01','2026-1-01','0000-01-01'])assert.throws(()=>api.validate({festivals:[sample('a',date)]}),/日期/);
 assert.doesNotThrow(()=>api.validate({festivals:[sample('a','2028-02-29')]}));assert.throws(()=>api.validate({festivals:[sample('a','')]}),/日期/);
});
test('full Gregorian date sorting handles years and keeps undated legacy last',()=>{
 const list=[sample('c','2027-01-01'),sample('b','2026-12-25'),{...sample('legacy-festival',''),eventDate:''},sample('a','2026-10-31')];
 assert.deepEqual(api.select(list).map(x=>x.id),['a','b','c','legacy-festival']);assert.deepEqual(list.map(x=>x.id),['c','b','legacy-festival','a']);
 const ties=[sample('b','2026-10-31','萬聖節'),sample('a','2026-10-31','萬聖節')];assert.deepEqual(api.select(ties).map(x=>x.id),['a','b']);
});
test('year month day and holiday filters compose without leaking hidden collections',()=>{
 const list=[sample('a','2026-10-31','萬聖節'),sample('b','2027-10-31','萬聖節'),sample('c','2026-12-25','聖誕節'),{...sample('hidden','2026-10-31','萬聖節'),published:false}];
 assert.deepEqual(api.select(list,{year:'2026',month:'10',day:'31',holiday:'萬聖節'}).map(x=>x.id),['a']);assert.deepEqual(api.select(list,{year:'2026',month:'11'}),[]);assert.equal(api.select(list,{holiday:'萬聖節'}).length,2);
});
test('saving festivals is immutable, preserves metadata and rejects stale or duplicate identities',()=>{
 const original={...sample('a','2026-10-31'),extra:'retain'},list=[original];const changed=api.saveFestival(list,'a',{...original,subtitle:'新系列'});
 assert.equal(changed[0].extra,'retain');assert.equal(original.subtitle,'節日');assert.throws(()=>api.saveFestival(list,null,sample('a','2026-12-25')),/重複/);assert.throws(()=>api.saveFestival(list,'gone',sample('gone','2026-12-25')),/不存在/);
 assert.throws(()=>api.validate({festivals:[original,original]}),/重複/);assert.throws(()=>api.validate({festivals:[{...original,buttonLink:'javascript:alert(1)'}]}),/連結/);
});
test('playback covers lead each series and omit hidden missing or repeated artwork',()=>{
 const f={...sample('a','2026-10-31'),workIds:['w2','missing','hidden','w1','duplicate']};
 const gallery=[{id:'w1',title:'第一幅',image:'assets/works/001.webp'},{id:'w2',title:'第二幅',image:'assets/works/002.webp'},{id:'hidden',title:'秘密',image:'assets/works/003.webp',published:false},{id:'duplicate',title:'重複封面',image:f.image}];
 const frames=api.frames([f],gallery);assert.deepEqual(frames.map(x=>x.image),['assets/works/031.webp','assets/works/002.webp','assets/works/001.webp']);assert.equal(frames[1].workTitle,'第二幅');assert.equal(frames[0].festival.id,'a');assert.deepEqual(api.frames([{...f,published:false}],gallery),[]);
});
test('playback wraps in both directions and handles empty and one-frame sequences',()=>{
 assert.equal(api.step(2,3,1),0);assert.equal(api.step(0,3,-1),2);assert.equal(api.step(0,0,1),0);assert.equal(api.step(0,1,1),0);
});
test('pre-upgrade singleton buffers restore into the legacy festival without converting new forms',()=>{
 const old={identity:'',values:{'festival-title':'未完成的舊系列'}};
 assert.equal(api.recoveryId({settings:{}},old),'legacy-festival');assert.equal(api.recoveryId({settings:{},festivals:[]},old),'');
 assert.equal(api.recoveryId({settings:{}},{identity:'',values:{'festival-id':''}}),'');assert.equal(api.recoveryId({settings:{}},{identity:'named',values:{}}),'named');
});
test('linked gallery covers follow artwork visibility deletion and replacement while independent covers remain',()=>{
 const linked={...sample('a','2026-10-31'),coverWorkId:'cover',workIds:['extra']},extra={id:'extra',title:'額外作品',image:'assets/works/002.webp'};
 const cover={id:'cover',title:'封面來源',image:'assets/works/001.webp'};
 assert.deepEqual(api.frames([linked],[cover,extra]).map(f=>f.image),['assets/works/001.webp','assets/works/002.webp']);
 assert.deepEqual(api.frames([linked],[{...cover,published:false},extra]).map(f=>f.image),['assets/works/002.webp']);
 assert.deepEqual(api.frames([linked],[extra]).map(f=>f.image),['assets/works/002.webp']);
 assert.equal(api.frames([{...linked,coverWorkId:''}],[{...cover,published:false}])[0].image,'assets/works/031.webp');
 assert.equal(api.frames([{...sample('legacy-festival',''),coverWorkId:undefined}],[])[0].image,'assets/works/031.webp');
});

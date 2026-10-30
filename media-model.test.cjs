const {test}=require('node:test'),assert=require('node:assert/strict');
const m=(()=>{try{return require('./media-model.js')}catch{return {}}})();
const fixture=()=>({settings:{brand:'塗塗'},gallery:[{id:'a',title:'隱藏作品',category:'角色',image:'assets/works/a.png',published:false},{id:'b',title:'共用作品',image:'assets/works/a.png'}],lineProducts:[{id:'1',title:'貼圖',image:'assets/works/a.png'}],festivals:[{id:'f',subtitle:'節慶',image:'assets/works/a.png'}]});
test('catalog deduplicates exact images and reports hidden records plus implicit characters and fixed artwork',()=>{
 assert.equal(typeof m.catalog,'function');const s=fixture(),before=structuredClone(s),rows=m.catalog(s);const a=rows.find(x=>x.image==='assets/works/a.png');assert.equal(a.uses.length,4);assert.ok(a.uses.some(x=>x.label.includes('隱藏作品')));assert.equal(rows.filter(x=>x.image==='assets/works/a.png').length,1);assert.ok(rows.find(x=>x.image==='assets/xiaolan-sister.png').uses.some(x=>x.kind==='characters'));assert.ok(rows.find(x=>x.image==='assets/tutu-hero.webp').uses.some(x=>x.kind==='fixed'));assert.deepEqual(s,before);
 const legacy=m.catalog({settings:{festivalImage:'assets/works/legacy.png'},gallery:[],characters:[]});assert.ok(legacy.find(x=>x.image==='assets/works/legacy.png').uses.length);assert.ok(!legacy.find(x=>x.image==='assets/xiaolan-sister.png'));
});
test('metadata is independent of public records and exact duplicate uploads retain existing names',()=>{
 const s=fixture(),r=m.save(s,'assets/works/a.png',{name:'我的素材',category:'教學',alt:'蠟筆角色'});assert.equal(r.mediaLibrary[0].name,'我的素材');assert.deepEqual(r.gallery,s.gallery);assert.equal(s.mediaLibrary,undefined);
 const next=m.add(r,[{image:'assets/works/a.png',name:'重複',category:'新',alt:''},{image:'data:image/webp;base64,AAAA',name:'新圖',category:'教學',alt:'新',width:100,height:80}]);assert.equal(next.mediaLibrary.length,2);assert.equal(next.mediaLibrary[0].name,'我的素材');assert.equal(m.catalog(next).find(x=>x.image==='data:image/webp;base64,AAAA').uses.length,0);
});
test('validation rejects unsafe sources, duplicate image keys, bad dimensions and malformed metadata',()=>{
 for(const list of [null,{},[{image:'https://evil.example/a.png',name:'a',category:'',alt:''}],[{image:'assets/works/a.png',name:'',category:'',alt:''}],[{image:'assets/works/a.png',name:'a',category:'',alt:'',width:-1}],[{image:'assets/works/a.png',name:'a',category:'',alt:''},{image:'assets/works/a.png',name:'b',category:'',alt:''}]])assert.throws(()=>m.validate({mediaLibrary:list}));
 assert.doesNotThrow(()=>m.validate({}));assert.doesNotThrow(()=>m.validate({mediaLibrary:[]}));
});
test('delete refuses used, hidden, fixed and unknown images and removes only selected unused saved entries',()=>{
 let s=m.add(fixture(),[{image:'data:image/png;base64,AAAA',name:'unused',category:'',alt:''},{image:'data:image/png;base64,BBBB',name:'keep',category:'',alt:''}]);
 for(const image of ['assets/works/a.png','assets/tutu-boy.webp','assets/works/missing.png'])assert.throws(()=>m.remove(s,[image]));assert.throws(()=>m.remove(s,[]));
 const r=m.remove(s,['data:image/png;base64,AAAA']);assert.deepEqual(r.mediaLibrary.map(x=>x.name),['keep']);assert.deepEqual(r.gallery,s.gallery);assert.equal(s.mediaLibrary.length,2);
});
test('batch category saves metadata for selected existing images without altering public data',()=>{
 const s=fixture(),r=m.batch(s,['assets/works/a.png'],'校園');assert.equal(r.mediaLibrary[0].category,'校園');assert.deepEqual(r.gallery,s.gallery);assert.throws(()=>m.batch(s,['gone'],'x'));assert.throws(()=>m.batch(s,[],'x'));assert.throws(()=>m.batch(s,['assets/works/a.png'],'x'.repeat(81)));
});
test('search category and usage filters prune invisible selection',()=>{
 const rows=[{image:'a',name:'小藍',category:'校園',alt:'老師',uses:[{label:'作品'}]},{image:'b',name:'節慶',category:'節日',alt:'',uses:[]}];assert.deepEqual(m.select(['a','b','a'],rows,{query:'老師',category:'校園',usage:'used'}),['a']);assert.deepEqual(m.select(['a','b'],rows,{usage:'unused'}),['b']);assert.deepEqual(m.select(['a'],rows,{category:'節日'}),[]);
});
test('Undo restores only library state and refuses newer library changes',()=>{
 const s=fixture(),r=m.save(s,'assets/works/a.png',{name:'素材',category:'',alt:''}),t=m.checkpoint(s,r);r.gallery[0]={...r.gallery[0],title:'新標題'};const restored=m.undo(r,t);assert.equal(restored.mediaLibrary,undefined);assert.equal(restored.gallery[0].title,'新標題');assert.throws(()=>m.undo({...r,mediaLibrary:[]},t),/其他修改/);
});
test('readiness fails closed for absent form protection, initialization, synchronization and unfinished edits',()=>{
 for(const state of [{},{formsReady:true},{publishReady:true},{formsReady:true,publishReady:true,busy:true},{formsReady:true,publishReady:true,pending:true}])assert.equal(m.ready(state),false);assert.equal(m.ready({formsReady:true,publishReady:true}),true);
});
test('duplicate images in one upload batch are added once and keep the first metadata',()=>{
 const x={image:'data:image/png;base64,AAAA',name:'第一張',category:'',alt:''};const result=m.add({gallery:[],characters:[],festivals:[]},[x,{...x,name:'重複'}]);assert.equal(result.mediaLibrary.length,1);assert.equal(result.mediaLibrary[0].name,'第一張');
});
test('CMS-valid long public titles remain batch classifiable without changing the public title',()=>{
 const title='長'.repeat(150),s={settings:{brand:'塗塗',lineUrl:'https://line.me/'},gallery:[{id:'a',title,image:'assets/works/a.png'}],lineProducts:[{id:'123',title,url:'https://store.line.me/stickershop/product/123/zh-Hant',image:'assets/works/p.png'}],news:[],characters:[],festivals:[]};require('./github-cms.js').validateData(s);
 for(const image of ['assets/works/a.png','assets/works/p.png']){const result=m.batch(s,[image],'校園');assert.equal(result.mediaLibrary[0].name.length,120);assert.equal(result.mediaLibrary[0].category,'校園');assert.equal(result.gallery[0].title,title);assert.equal(result.lineProducts[0].title,title);}
});
test('festival usage and search include selected works and the current linked cover rather than stale stored cover',()=>{
 const s={settings:{},gallery:[{id:'cover',title:'封面作品',image:'assets/works/current.png',published:false},{id:'work',title:'輪播作品',image:'assets/works/slide.png'}],characters:[],festivals:[{id:'f',holidayName:'世界兒童節',image:'assets/works/old.png',coverWorkId:'cover',workIds:['work'],published:false}]};
 const rows=m.catalog(s);for(const path of ['assets/works/current.png','assets/works/slide.png']){const row=rows.find(x=>x.image===path);assert.ok(row.uses.some(x=>x.kind==='festivals'&&x.id==='f'));assert.equal(m.matches(row,{query:'世界兒童節'}),true);}assert.equal(rows.find(x=>x.image==='assets/works/old.png').uses.length,0);
});
test('manifest large app icon is a protected fixed public usage even when it has saved metadata',()=>{
 const s={gallery:[],characters:[],festivals:[],mediaLibrary:[{image:'assets/icon-512.png',name:'圖示',category:'',alt:''}]};assert.ok(m.catalog(s).find(x=>x.image==='assets/icon-512.png').uses.some(x=>x.kind==='fixed'));assert.throws(()=>m.remove(s,['assets/icon-512.png']),/保護/);
});

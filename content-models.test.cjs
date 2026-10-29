const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const m=(()=>{try{return require('./content-models.js')}catch{return {}}})();
const data=()=>JSON.parse(fs.readFileSync(__dirname+'/data/site.json','utf8'));
const product=(id='12345678')=>({id,url:`https://store.line.me/stickershop/product/${id}/zh-Hant`,title:'新的塗塗貼圖',author:'瀧ir.',category:'生日祝福',description:'一句暖暖祝福',image:'assets/works/009.webp',published:true});
const character=(id='friend')=>({id,name:'新夥伴',description:'一起畫畫的好朋友',image:'assets/tutu-boy.webp',imageAlt:'揮手的塗塗',link:'',linkText:'',gallerySeries:'',published:true});

test('LINE URLs canonicalize safely without accepting other sites or credentials',()=>{
 assert.equal(typeof m.productFromUrl,'function');
 assert.deepEqual(m.productFromUrl(' https://store.line.me/stickershop/product/12345678/zh-Hant?from=share '),{id:'12345678',url:'https://store.line.me/stickershop/product/12345678/zh-Hant'});
 assert.deepEqual(m.productFromUrl('https://line.me/S/sticker/12345678'),{id:'12345678',url:'https://store.line.me/stickershop/product/12345678/zh-Hant'});
 for(const url of ['javascript:alert(1)','https://evil.example/12345678','https://store.line.me.evil.example/stickershop/product/12345678/zh-Hant','http://line.me/S/sticker/12345678','https://user:pass@line.me/S/sticker/12345678'])assert.throws(()=>m.productFromUrl(url),/LINE/);
});

test('editing a product preserves other records and metadata but refuses duplicate IDs',()=>{
 assert.equal(typeof m.saveProduct,'function');
 const original=[{...product(),checkedDate:'2026-10-29',sourceImageUrl:'https://example.com/cover',custom:'保留欄位'},product('87654321')];
 const result=m.saveProduct(original,'12345678',{...product(),title:'更新的名稱'});
 assert.equal(result[0].title,'更新的名稱');assert.equal(result[0].custom,'保留欄位');assert.equal(result[0].checkedDate,'2026-10-29');assert.equal(original[0].title,'新的塗塗貼圖');assert.deepEqual(result[1],original[1]);
 assert.throws(()=>m.saveProduct(original,null,product()),/重複/);
 assert.throws(()=>m.saveProduct(original,'12345678',product('87654321')),/重複/);
 assert.throws(()=>m.saveProduct(original,'missing',product('11111111')),/不存在/);
});

test('changing product identity removes stale source verification claims',()=>{
 assert.equal(typeof m.saveProduct,'function');
 const original=[{...product(),checkedDate:'2026-10-29',sourceImageUrl:'https://example.com/old-cover',sourceAuthorUrl:'https://example.com/old-author',custom:'保留欄位'}];
 const result=m.saveProduct(original,'12345678',product('22222222'))[0];
 assert.equal(result.id,'22222222');assert.equal(result.checkedDate,undefined);assert.equal(result.sourceImageUrl,undefined);assert.equal(result.sourceAuthorUrl,undefined);assert.equal(result.custom,'保留欄位');
});

test('legacy characters retain four defaults while an explicit empty collection stays empty',()=>{
 assert.equal(typeof m.charactersFor,'function');
 const old=m.charactersFor({});assert.deepEqual(old.map(c=>c.name),['男塗塗','女塗塗','小藍姐姐','藍田老師']);
 assert.equal(old.find(c=>c.id==='lantian').gallerySeries,'藍田老師的教學日常');
 old[0].name='修改測試';assert.equal(m.charactersFor({})[0].name,'男塗塗');
 assert.deepEqual(m.charactersFor({characters:[]}),[]);
});

test('character updates preserve IDs and metadata and reject broken button settings',()=>{
 assert.equal(typeof m.saveCharacter,'function');
 const old=[{...character(),custom:'保留欄位'}];
 const edited=m.saveCharacter(old,'friend',{...character(),name:'新名字',published:false});
 assert.equal(edited[0].custom,'保留欄位');assert.equal(edited[0].published,false);assert.equal(old[0].name,'新夥伴');
 assert.throws(()=>m.saveCharacter(old,null,character()),/重複/);
 assert.throws(()=>m.saveCharacter(old,'friend',{...character('another')}),/識別/);
 assert.throws(()=>m.saveCharacter([],null,{...character(),link:'javascript:alert(1)',linkText:'點我'}),/連結/);
 assert.throws(()=>m.saveCharacter([],null,{...character(),link:'#gallery',linkText:''}),/按鈕/);
});

test('moving an item changes one position without dropping hidden records or mutating input',()=>{
 assert.equal(typeof m.moveItem,'function');
 const old=[{id:'a'},{id:'b',published:false},{id:'c'}];
 assert.deepEqual(m.moveItem(old,'c',-1).map(x=>x.id),['a','c','b']);
 assert.deepEqual(m.moveItem(old,'a',-1),old);assert.deepEqual(old.map(x=>x.id),['a','b','c']);
 assert.throws(()=>m.moveItem(old,'a',2));
});

test('collection validation accepts current content and rejects unsafe or malformed new fields',()=>{
 assert.equal(typeof m.validateCollections,'function');assert.doesNotThrow(()=>m.validateCollections(data()));
 for(const patch of [{image:'https://example.com/tracker.png'},{id:'12345678',url:'https://store.line.me/stickershop/product/22222222/zh-Hant'},{published:'false'},{title:''}]){
  assert.throws(()=>m.validateCollections({lineProducts:[{...product(),...patch}]}),/貼圖/);
 }
 assert.throws(()=>m.validateCollections({characters:null}),/角色/);
 assert.throws(()=>m.validateCollections({characters:[character(),character()]}),/重複/);
 assert.throws(()=>m.validateCollections({characters:[{...character(),image:'assets/../secret.png'}]}),/圖片/);
});

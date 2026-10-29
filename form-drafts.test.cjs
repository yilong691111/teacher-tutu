const {test}=require('node:test');
const assert=require('node:assert/strict');
const f=(()=>{try{return require('./form-drafts.js')}catch{return {}}})();

test('different festival dates and selected artwork recover independently without changing identity',()=>{
 const disk=storage(),store=new f.Store(disk);
 store.put('festival-form','a',{'festival-id':'a','festival-date':'2026-10-31','festival-holiday-name':'萬聖節','festival-work-ids':'w2,w1','festival-published':true});
 store.put('festival-form','b',{'festival-id':'b','festival-date':'2026-12-25','festival-holiday-name':'聖誕節','festival-work-ids':'w3','festival-published':false});
 const restored=new f.Store(disk);assert.equal(restored.get('festival-form','a').values['festival-date'],'2026-10-31');assert.equal(restored.get('festival-form','a').values['festival-work-ids'],'w2,w1');
 restored.remove('festival-form','a');assert.equal(restored.get('festival-form','b').values['festival-published'],false);assert.equal(restored.get('festival-form','b').values['festival-id'],'b');
});
function storage(){const values=new Map();return {values,quota:false,get length(){return values.size},key:i=>[...values.keys()][i]??null,getItem:k=>values.get(k)??null,setItem(k,v){if(this.quota)throw new Error('quota');values.set(k,v)},removeItem:k=>values.delete(k)};}

test('unfinished fields survive reopening without becoming saved site data',()=>{
 assert.equal(typeof f.Store,'function');const disk=storage(),store=new f.Store(disk);
 assert.equal(store.put('work-form','w1',{'work-id':'w1','work-title':'還沒寫完','work-description':'','work-published':false}),true);
 const recovered=new f.Store(disk).get('work-form','w1');
 assert.equal(recovered.values['work-title'],'還沒寫完');assert.equal(recovered.values['work-published'],false);
 assert.ok([...disk.values.keys()].every(k=>!k.includes('static-cms-v2')));
});

test('credential fields and unrelated form values never enter temporary storage',()=>{
 assert.equal(typeof f.Store,'function');const disk=storage(),store=new f.Store(disk);
 store.put('settings-form','',{'settings-brand':'塗塗老師','github-token':'never-store-this','password':'secret','news-title':'別的表單'});
 const encoded=[...disk.values.values()].join('');assert.ok(!encoded.includes('never-store-this'));assert.ok(!encoded.includes('secret'));assert.ok(!encoded.includes('別的表單'));
 assert.deepEqual(store.get('settings-form','').values,{'settings-brand':'塗塗老師'});
 assert.throws(()=>store.put('github-connect-form','',{'github-token':'secret'}));
});

test('each form and record has an independent buffer, including another editor instance',()=>{
 assert.equal(typeof f.Store,'function');const disk=storage(),a=new f.Store(disk),b=new f.Store(disk);
 a.put('work-form','w1',{'work-title':'作品一'});b.put('work-form','w2',{'work-title':'作品二'});a.put('news-form','n1',{'news-title':'公告一'});
 assert.equal(new f.Store(disk).all().length,3);a.remove('work-form','w1');
 assert.equal(new f.Store(disk).get('work-form','w1'),null);assert.equal(new f.Store(disk).get('work-form','w2').values['work-title'],'作品二');assert.equal(new f.Store(disk).get('news-form','n1').values['news-title'],'公告一');
});

test('quota failure retains the current page buffer and can be retried without losing prior storage',()=>{
 assert.equal(typeof f.Store,'function');const disk=storage(),store=new f.Store(disk);
 store.put('character-form','friend',{'character-name':'原本的名字'});disk.quota=true;
 assert.equal(store.put('character-form','friend',{'character-name':'尚未寫入的新名字'}),false);assert.equal(store.persisted,false);
 assert.equal(store.get('character-form','friend').values['character-name'],'尚未寫入的新名字');assert.equal(new f.Store(disk).get('character-form','friend').values['character-name'],'原本的名字');
 disk.quota=false;assert.equal(store.flush(),true);assert.equal(store.persisted,true);assert.equal(new f.Store(disk).get('character-form','friend').values['character-name'],'尚未寫入的新名字');
});

test('converted image buffers survive recovery and malformed stored entries are ignored',()=>{
 assert.equal(typeof f.Store,'function');const disk=storage(),store=new f.Store(disk);
 const image='data:image/webp;base64,UklGRg==';store.put('line-product-form','',{'line-product-existing-image':image,'line-product-title':'圖片測試'});
 assert.equal(new f.Store(disk).get('line-product-form','').values['line-product-existing-image'],image);
 disk.values.set(f.PREFIX+'bad','not json');disk.values.set(f.PREFIX+'injected',JSON.stringify({formId:'github-connect-form',identity:'',values:{'github-token':'secret'}}));
 assert.equal(new f.Store(disk).all().length,1);
});

test('reverting fields to their original values clears the obsolete unfinished buffer',()=>{
 const disk=storage(),store=new f.Store(disk);assert.equal(typeof store.capture,'function');
 const original={'settings-brand':'塗塗老師','settings-tagline':'原本的短句'};
 assert.equal(store.capture('settings-form','',{...original,'settings-tagline':'修改中的短句'},original).changed,true);
 assert.equal(store.all().length,1);
 assert.equal(store.capture('settings-form','',original,original).changed,false);
 assert.equal(store.all().length,0);assert.equal(new f.Store(disk).get('settings-form',''),null);
});

test('an older image conversion cannot replace a newer selection or a saved form',()=>{
 assert.equal(typeof f.imageResult,'function');const oldFile={},newFile={};
 const state={file:newFile,committed:false,values:{'character-name':'最近輸入的名字'}};
 assert.equal(f.imageResult(state,oldFile,'character-existing-image','old-image'),null);
 assert.deepEqual(f.imageResult(state,newFile,'character-existing-image','new-image'),{'character-name':'最近輸入的名字','character-existing-image':'new-image'});
 state.file=null;assert.equal(f.imageResult(state,newFile,'character-existing-image','new-image'),null);
 state.file=newFile;state.committed=true;assert.equal(f.imageResult(state,newFile,'character-existing-image','new-image'),null);
});

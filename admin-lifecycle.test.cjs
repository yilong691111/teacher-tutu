const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const buffers=require('./form-drafts.js');
const models=require('./content-models.js');
test('new and copied festival editors retain separate unfinished records rather than sharing an empty key',()=>{
 const {el}=dom(),storage=memoryStorage(),store=new buffers.Store(storage);
 const window={TutuFestivals:require('./festival-model.js'),TutuGitHub:require('./github-cms.js'),TutuFormDrafts:{canOpen:()=>true,begin(){}}};
 const context={window,document:{getElementById:el,createElement:()=>el('node-'+Math.random())},$:s=>el(s.slice(1)),site:{settings:{},gallery:[]},safeImg:String,releaseFestivalPreview(){},toast(){},uniqueId:()=> 'unused',crypto:{getRandomValues:globalThis.crypto.getRandomValues.bind(globalThis.crypto)},Option:function(text,value){return {text,value}},beginEditorSave(){},saveLocal:()=>true,saveFormDraft:()=>true};
 vm.runInNewContext(fs.readFileSync(__dirname+'/admin-festivals.js','utf8'),context);
 window.TutuFestivalsAdmin.edit('legacy-festival',true);const first=el('festival-id').value;store.put('festival-form',first,{'festival-id':first,'festival-subtitle':'第一個未完成複本','festival-date':'2026-10-31'});
 window.TutuFestivalsAdmin.edit();const second=el('festival-id').value;store.put('festival-form',second,{'festival-id':second,'festival-subtitle':'第二個未完成新增','festival-date':'2026-12-25'});
 assert.notEqual(first,'');assert.notEqual(first,second);assert.equal(new buffers.Store(storage).all().length,2);assert.equal(new buffers.Store(storage).get('festival-form',first).values['festival-date'],'2026-10-31');
});
function dom(){
 const elements=new Map();
 const el=id=>{
  if(!elements.has(id))elements.set(id,{id,value:'',files:[],type:'text',checked:false,hidden:false,disabled:false,inert:false,handlers:{},attrs:{},controls:[],addEventListener(k,f){this.handlers[k]=f},getAttribute(k){return this.attrs[k]??null},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},closest(q){return q==='form'?el(this.formId||'work-form'):{hidden:false}},querySelectorAll(){return this.controls},replaceChildren(){},append(){},scrollIntoView(){},reset(){}});
  return elements.get(id);
 };
 for(const [formId,fields] of Object.entries(buffers.FORM_FIELDS)){
  for(const id of fields){el(id).formId=formId;el(formId).controls.push(el(id));}
 }
 for(const [formId,file] of [['work-form','work-file'],['festival-form','festival-file'],['line-product-form','line-product-file'],['character-form','character-file']]){el(file).formId=formId;el(formId).controls.push(el(file));}
 return {el,elements};
}
function memoryStorage(){const disk=new Map();return {get length(){return disk.size},key:i=>[...disk.keys()][i]??null,getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v),removeItem:k=>disk.delete(k)};}
function draftHarness(compressImage){
 const {el}=dom(),events={},windowEvents={},storage=memoryStorage(),toasts=[];
 el('work-id').value='w1';el('work-existing-image').value='assets/works/009.webp';
 const window={TutuFormBuffers:buffers,dispatchEvent(){}};
 const context={window,document:{getElementById:el,createElement:()=>el('dynamic-'+Math.random()),addEventListener:(k,f)=>events[k]=f},$:s=>el(s.slice(1)),localStorage:storage,MutationObserver:class{observe(){}},CustomEvent:class{},addEventListener:(k,f)=>windowEvents[k]=f,checkFestivalFile(){},compressImage,toast:m=>toasts.push(m),safeImg:String,setTimeout,clearTimeout,confirm:()=>true};
 vm.runInNewContext(fs.readFileSync(__dirname+'/admin-drafts.js','utf8'),context);
 return {el,events,windowEvents,manager:window.TutuFormDrafts,storage,toasts};
}

test('async product save locks the form before waiting for image conversion',async()=>{
 const {el}=dom();let resolve;const pending=new Promise(r=>resolve=r),savedForms=[];
 el('line-product-form').controls.push(el('save-product'));
 const site={lineProducts:[],gallery:[],characters:[]};
 const context={window:{TutuContent:models,TutuGitHub:{validateData(){}},TutuFormDrafts:{imageFor:()=>pending}},$:s=>el(s.slice(1)),site,URL,Option:function(){},clean:String,safeImg:String,checkFestivalFile(){},saveFormDraft:id=>(savedForms.push(id),true),saveLocal:()=>true,beginEditorSave:id=>buffers.lockForm(el(id)),toast(){},uniqueId:()=> 'new'};
 vm.runInNewContext(fs.readFileSync(__dirname+'/admin-collections.js','utf8'),context);
 el('line-product-url').value='https://line.me/S/sticker/123';el('line-product-title').value='Before Save';el('line-product-file').files=[{name:'first.png'}];
 const operation=el('line-product-form').handlers.submit({preventDefault(){}});
 const wasLocked=el('line-product-title').disabled;
 if(!wasLocked)el('line-product-title').value='Newer input during save';
 resolve('assets/works/009.webp');await operation;
 assert.equal(wasLocked,true);assert.equal(site.lineProducts[0].title,'Before Save');assert.equal(el('line-product-title').value,'Before Save');assert.equal(el('line-product-title').disabled,false);assert.deepEqual(savedForms,['line-product-form']);
});

test('failed replacement image stays visibly pending and blocks leaving until explicitly cancelled',async()=>{
 let reject;const pending=new Promise((_,r)=>reject=r),h=draftHarness(()=>pending);
 h.el('work-file').files=[{name:'broken.png',type:'image/png'}];h.events.change({target:h.el('work-file')});reject(new Error('圖片讀取失敗'));await new Promise(r=>setImmediate(r));
 const canLeave=h.manager.canLeave();let prevented=false;h.windowEvents.beforeunload({preventDefault(){prevented=true}});
 assert.equal(canLeave,false);assert.equal(h.manager.hasPending(),true);assert.equal(prevented,true);assert.equal(h.el('work-image-warning').hidden,false);assert.match(h.el('edit-buffer-status').textContent,/圖片.*無法/);
 const stored=new buffers.Store(h.storage).get('work-form','w1');assert.equal(stored.values['work-image-error'],'1');
 h.el('work-cancel-image').onclick();assert.equal(h.manager.hasPending(),false);assert.equal(h.el('work-image-warning').hidden,true);
});

test('editor save gate blocks navigation, recovery and closing and restores existing disabled states',()=>{
 const h=draftHarness(()=>Promise.resolve('assets/works/009.webp'));
 assert.equal(typeof h.manager.beginSave,'function');h.el('work-category').disabled=true;
 const release=h.manager.beginSave('work-form');
 assert.equal(h.el('dashboard').inert,true);assert.equal(h.el('work-title').disabled,true);assert.equal(h.manager.canLeave(),false);assert.equal(h.manager.canOpen('work-form'),false);assert.equal(h.manager.hasPending(),true);
 assert.throws(()=>h.manager.importBackup({format:'tutu-form-buffers-v1',records:[]}),/儲存/);
 let prevented=false;h.windowEvents.beforeunload({preventDefault(){prevented=true}});assert.equal(prevented,true);
 release();assert.equal(h.el('dashboard').inert,false);assert.equal(h.el('work-title').disabled,false);assert.equal(h.el('work-category').disabled,true);assert.equal(h.manager.hasPending(),false);
});

test('a synchronous image preparation error receives the same persistent protection',()=>{
 const h=draftHarness(()=>{throw new Error('圖片無法讀取');});h.el('work-file').files=[{name:'broken.png',type:'image/png'}];h.events.change({target:h.el('work-file')});
 assert.equal(h.manager.canLeave(),false);assert.equal(h.manager.hasPending(),true);assert.equal(h.el('work-image-warning').hidden,false);
 h.el('work-cancel-image').onclick();assert.equal(h.manager.hasPending(),false);
});
test('successful independent festival uploads clear gallery provenance in recovered buffers while failed uploads preserve it',async()=>{
 const h=draftHarness(()=>Promise.resolve('data:image/webp;base64,AAAA'));h.el('festival-cover-work-id').value='cover';h.manager.begin('festival-form','festival-a');h.el('festival-file').files=[{name:'new.png'}];h.events.change({target:h.el('festival-file')});await Promise.resolve();await Promise.resolve();h.manager.flush();
 assert.equal(h.el('festival-cover-work-id').value,'');assert.equal(new buffers.Store(h.storage).get('festival-form','festival-a').values['festival-cover-work-id'],'');
 const bad=draftHarness(()=>Promise.reject(new Error('broken')));bad.el('festival-cover-work-id').value='cover';bad.manager.begin('festival-form','festival-b');bad.el('festival-file').files=[{name:'broken.png'}];bad.events.change({target:bad.el('festival-file')});await Promise.resolve();await Promise.resolve();bad.el('festival-cancel-image').onclick();assert.equal(bad.el('festival-cover-work-id').value,'cover');
});
test('choosing a library image clears a failed upload and saves the replacement in unfinished recovery',async()=>{
 const h=draftHarness(()=>Promise.reject(new Error('broken')));h.el('work-file').files=[{name:'bad.png'}];h.events.change({target:h.el('work-file')});await new Promise(r=>setImmediate(r));assert.equal(h.el('work-image-warning').hidden,false);
 h.el('work-file').files=[];h.el('work-existing-image').value='assets/works/replacement.png';h.el('work-image-error').value='';h.events.input({target:h.el('work-existing-image')});h.manager.flush();assert.equal(h.el('work-image-warning').hidden,true);assert.equal(new buffers.Store(h.storage).get('work-form','w1').values['work-existing-image'],'assets/works/replacement.png');assert.equal(new buffers.Store(h.storage).get('work-form','w1').values['work-image-error'],'');
});

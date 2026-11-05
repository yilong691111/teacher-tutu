const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const media=require('./media-model.js'),editor=require('./media-editor.js'),cms=require('./github-cms.js');
function harness({forms=true,initialized=true,pending=false,dropzone=true,detailDelete=true,convert=()=>Promise.resolve('data:image/webp;base64,AAAA')}={}){
 const elements=new Map(),created=[],events={},queued=[],messages=[];let saved=0;
 const make=(tag='div')=>({tag,value:'',hidden:false,inert:false,disabled:false,checked:false,open:false,textContent:'',files:[],dataset:{},attrs:{},children:[],listeners:{},className:'',getAttribute(k){return this.attrs[k]??null},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},addEventListener(k,f){(this.listeners[k]??=[]).push(f)},dispatchEvent(e){for(const f of this.listeners[e.type]||[])f(e);return true;},append(...args){this.children.push(...args)},replaceChildren(...args){this.children=args},showModal(){this.open=true},close(){this.open=false;queued.push(()=>this.dispatchEvent({type:'close'}))}});
 const el=id=>{if(id==='media-dropzone'&&!dropzone||!detailDelete&&['media-detail-delete','media-delete-help'].includes(id))return null;if(!elements.has(id)){const x=make();x.id=id;elements.set(id,x);}return elements.get(id);};
 const trigger=make('button');trigger.dataset.mediaPicker='work';el('work-form').hidden=false;el('work-id').value='w';el('media-usage').value='';
 const window={TutuMedia:media,TutuMediaEditor:editor,TutuGitHub:cms,TutuPublishReady:initialized,addEventListener:(k,f)=>(events[k]??=[]).push(f)};if(forms)window.TutuFormDrafts={hasPending:()=>pending};
 const site={settings:{brand:'塗塗',lineUrl:'https://line.me/'},gallery:[{id:'w',title:'作品',image:'assets/works/a.png'},{id:'other',title:'另外',image:'assets/works/b.png'}],news:[],characters:[],festivals:[]};
 const context={window,site,document:{getElementById:el,createTextNode:String,createElement:tag=>{const x=make(tag);created.push(x);return x;}},$:s=>el(s.slice(1)),$$:s=>s==='[data-media-picker]'?[trigger]:[],safeImg:String,Option:function(text,value){this.text=text;this.value=value},TextEncoder,MutationObserver:class{observe(){}},Event,Image:class{set src(v){this.naturalWidth=100;this.naturalHeight=80;queueMicrotask(()=>this.onload());}},checkFestivalFile(){},compressImage:convert,toast:(message)=>messages.push(message),saveLocal:()=>{saved++;return true},releaseFestivalPreview(){},confirm:()=>true};
 vm.runInNewContext(fs.readFileSync(__dirname+'/admin-media.js','utf8'),context);
 return {el,created,trigger,context,window,events,queued,messages,get saved(){return saved},emit:k=>(events[k]||[]).forEach(f=>f({}))};
}
test('rapid cancel/reopen does not let a queued old dialog-close event discard the current picker target',()=>{
 const h=harness();h.trigger.onclick();h.el('media-picker-close').onclick();h.trigger.onclick();h.queued.splice(0).forEach(f=>f());
 const button=h.created.filter(x=>x.attrs['aria-label']==='選用素材 作品').at(-1);button.onclick();assert.equal(h.el('work-existing-image').value,'assets/works/a.png');assert.equal(h.el('media-picker-dialog').open,false);assert.equal(h.saved,0);
});

function drag(files=[],types=['Files']){return {type:'drop',dataTransfer:{files,types,dropEffect:'none'},prevented:false,stopped:false,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;}};}
test('file selection still uploads when a cached admin page has no drop zone',async()=>{
 const h=harness({dropzone:false});h.el('media-files').files=[{name:'selected.png'}];await h.el('media-upload-form').onsubmit({preventDefault(){}});assert.equal(h.saved,1);assert.equal(h.context.site.mediaLibrary[0].name,'selected');
});
async function drop(h,files){const event=drag(files);await h.el('media-dropzone').ondrop?.(event);return event;}
test('dropping multiple local images adds named, categorized, deduplicated library drafts',async()=>{
 const h=harness({convert:file=>Promise.resolve('data:image/webp;base64,'+(file.name.startsWith('first')?'AAAA':'BBBB'))});h.el('media-upload-category').value='人物';
 const event=await drop(h,[{name:'first.png'},{name:'second.webp'},{name:'first-copy.png'}]);
 assert.equal(event.prevented,true);assert.equal(event.stopped,true);assert.equal(h.saved,1);
 assert.deepEqual(JSON.parse(JSON.stringify(h.context.site.mediaLibrary)),[
  {image:'data:image/webp;base64,AAAA',name:'first',category:'人物',alt:'',width:100,height:80},
  {image:'data:image/webp;base64,BBBB',name:'second',category:'人物',alt:'',width:100,height:80}
 ]);assert.match(h.el('media-upload-status').textContent,/略過 1 張重複/);
});
test('a drop continues with valid images when one image cannot be decoded',async()=>{
 const h=harness({convert:file=>file.name==='broken.png'?Promise.reject(new Error('圖片格式無法處理')):Promise.resolve('data:image/webp;base64,AAAA')});
 await drop(h,[{name:'broken.png'},{name:'good.png'}]);assert.equal(h.context.site.mediaLibrary.length,1);assert.equal(h.context.site.mediaLibrary[0].name,'good');assert.match(h.el('media-upload-status').textContent,/broken.png：圖片格式無法處理/);
});
test('dropping too many images or into an unready library cannot write drafts',async()=>{
 const h=harness();await drop(h,Array.from({length:11},(_,i)=>({name:i+'.png'})));assert.equal(h.saved,0);assert.ok(h.messages.length);
 for(const state of [{forms:false},{initialized:false},{pending:true}]){const h=harness(state);const event=await drop(h,[{name:'image.png'}]);assert.equal(event.prevented,true);assert.equal(h.saved,0);assert.equal(h.el('media-dropzone').attrs['aria-disabled'],'true');}
});
test('an upload in progress blocks a second drop and unlocks after it finishes',async()=>{
 let resolve;const h=harness({convert:()=>new Promise(r=>resolve=r)});const first=drop(h,[{name:'first.png'}]);assert.equal(h.el('dashboard').inert,true);
 await drop(h,[{name:'second.png'}]);assert.equal(h.saved,0);resolve('data:image/webp;base64,AAAA');await first;assert.equal(h.saved,1);assert.equal(h.context.site.mediaLibrary[0].name,'first');assert.equal(h.el('dashboard').inert,false);assert.equal(h.el('media-files').disabled,false);
});
test('file drag feedback survives child transitions and leaves ordinary link dragging alone',async()=>{
 const h=harness(),zone=h.el('media-dropzone');zone.dispatchEvent({...drag(),type:'dragenter'});zone.dispatchEvent({...drag(),type:'dragenter'});zone.dispatchEvent({...drag(),type:'dragleave'});assert.equal(zone.attrs['data-drag-active'],'true');
 zone.dispatchEvent({...drag(),type:'dragleave'});assert.equal(zone.attrs['data-drag-active'],'false');
 const link=drag([],['text/uri-list']);await zone.ondrop?.(link);assert.equal(link.prevented,false);assert.equal(h.saved,0);
});
test('dropping outside the upload zone on the library page prevents browser navigation without importing',()=>{
 const h=harness(),event=drag([{name:'image.png'}]);for(const handler of h.events.drop||[])handler(event);assert.equal(event.prevented,true);assert.equal(h.saved,0);
});
test('library bulk selection is reduced to visible search rows before modifying metadata',()=>{
 const h=harness();h.el('media-select-all').onchange({target:{checked:true}});h.el('media-search').value='另外';h.el('media-search').dispatchEvent({type:'input'});assert.equal(h.el('media-selected-count').textContent,'已勾選 1 張');h.el('media-batch-category').value='測試';h.el('media-batch-apply').onclick();assert.equal(h.context.site.mediaLibrary.length,1);assert.equal(h.context.site.mediaLibrary[0].image,'assets/works/b.png');assert.equal(h.context.site.gallery[1].category,undefined);assert.equal(h.saved,1);
});
test('missing initialization or unfinished forms disable library mutations and async upload locks the dashboard',async()=>{
 for(const options of [{forms:false},{initialized:false},{pending:true}]){const h=harness(options);assert.equal(h.el('media-upload').disabled,true);}
 let resolve;const h=harness({convert:()=>new Promise(r=>resolve=r)});h.el('media-files').files=[{name:'uploaded.png'}];const operation=h.el('media-upload-form').onsubmit({preventDefault(){}});assert.equal(h.el('dashboard').inert,true);assert.equal(h.el('content').attrs['aria-busy'],'true');let prevented=false;h.events.beforeunload[0]({preventDefault(){prevented=true}});assert.equal(prevented,true);resolve('data:image/webp;base64,AAAA');await operation;assert.equal(h.el('dashboard').inert,false);assert.equal(h.context.site.mediaLibrary[0].width,100);assert.equal(h.saved,1);
});
test('single-image deletion asks confirmation, removes just the chosen image and supports undo',()=>{
 const h=harness();h.context.site=media.add(h.context.site,[{image:'assets/works/unused.png',name:'刪除測試',category:'',alt:''},{image:'assets/works/keep.png',name:'保留素材',category:'',alt:''}]);h.window.TutuMediaAdmin.render();
 const button=h.created.filter(x=>x.attrs['aria-label']==='刪除素材 刪除測試').at(-1);assert.ok(button);assert.equal(button.disabled,false);
 let confirmations=0;h.context.confirm=()=>{confirmations++;return false;};button.onclick();assert.equal(h.context.site.mediaLibrary.length,2);assert.equal(h.saved,0);
 h.context.confirm=()=>{confirmations++;return true;};button.onclick();assert.equal(confirmations,2);assert.deepEqual(h.context.site.mediaLibrary.map(x=>x.name),['保留素材']);assert.equal(h.saved,1);
 h.el('media-undo').onclick();assert.equal(h.context.site.mediaLibrary.length,2);assert.equal(h.saved,2);
});
test('cached markup without the new detail button still starts and supports card deletion',()=>{
 const h=harness({detailDelete:false});h.context.site=media.add(h.context.site,[{image:'assets/works/unused.png',name:'刪除測試',category:'',alt:''}]);h.window.TutuMediaAdmin.render();
 h.created.filter(x=>x.attrs['aria-label']==='刪除素材 刪除測試').at(-1).onclick();assert.equal(h.saved,1);assert.equal(h.context.site.mediaLibrary.length,0);
});
test('used images are protected even if their disabled single delete handler is called',()=>{
 const h=harness();const button=h.created.filter(x=>x.attrs['aria-label']==='刪除素材 作品').at(-1);assert.ok(button);assert.equal(button.disabled,true);
 let confirmations=0;h.context.confirm=()=>{confirmations++;return true;};button.onclick();assert.equal(h.saved,0);assert.equal(confirmations,0);assert.equal(h.context.site.gallery.length,2);assert.match(button.title,/使用/);
});
test('detail deletion closes the dialog and removes stale selections; cancel keeps unsaved metadata',()=>{
 const h=harness();h.context.site=media.add(h.context.site,[{image:'assets/works/unused.png',name:'刪除測試',category:'',alt:''}]);h.window.TutuMediaAdmin.render();
 h.el('media-search').value='刪除測試';h.el('media-search').dispatchEvent({type:'input'});h.el('media-select-all').onchange({target:{checked:true}});
 h.created.filter(x=>x.attrs['aria-label']==='查看素材 刪除測試').at(-1).onclick();h.el('media-name').value='尚未儲存';
 h.context.confirm=()=>false;h.el('media-detail-delete').onclick();assert.equal(h.el('media-detail-dialog').open,true);assert.equal(h.el('media-name').value,'尚未儲存');assert.equal(h.saved,0);
 h.context.confirm=()=>true;h.el('media-detail-delete').onclick();assert.equal(h.el('media-detail-dialog').open,false);assert.equal(h.context.site.mediaLibrary.length,0);assert.equal(h.el('media-selected-count').textContent,'已勾選 0 張');assert.equal(h.saved,1);
});
test('single deletion refuses unfinished forms and rechecks usage changed since the card was rendered',()=>{
 const h=harness();h.context.site=media.add(h.context.site,[{image:'assets/works/unused.png',name:'刪除測試',category:'',alt:''}]);h.window.TutuMediaAdmin.render();
 const button=h.created.filter(x=>x.attrs['aria-label']==='刪除素材 刪除測試').at(-1);assert.ok(button);
 h.window.TutuFormDrafts.hasPending=()=>true;h.emit('tutu:form-buffer');button.onclick();assert.equal(h.saved,0);
 h.window.TutuFormDrafts.hasPending=()=>false;h.context.site.gallery.push({id:'new-use',title:'新使用位置',image:'assets/works/unused.png'});button.onclick();assert.equal(h.saved,0);assert.equal(h.context.site.mediaLibrary.length,1);
});


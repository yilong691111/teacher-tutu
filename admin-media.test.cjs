const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const media=require('./media-model.js'),editor=require('./media-editor.js'),cms=require('./github-cms.js');
function harness({forms=true,initialized=true,pending=false,convert=()=>Promise.resolve('data:image/webp;base64,AAAA')}={}){
 const elements=new Map(),created=[],events={},queued=[];let saved=0;
 const make=(tag='div')=>({tag,value:'',hidden:false,inert:false,disabled:false,checked:false,open:false,textContent:'',files:[],dataset:{},attrs:{},children:[],listeners:{},className:'',getAttribute(k){return this.attrs[k]??null},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},addEventListener(k,f){(this.listeners[k]??=[]).push(f)},dispatchEvent(e){for(const f of this.listeners[e.type]||[])f(e);return true;},append(...args){this.children.push(...args)},replaceChildren(...args){this.children=args},showModal(){this.open=true},close(){this.open=false;queued.push(()=>this.dispatchEvent({type:'close'}))}});
 const el=id=>{if(!elements.has(id)){const x=make();x.id=id;elements.set(id,x);}return elements.get(id);};
 const trigger=make('button');trigger.dataset.mediaPicker='work';el('work-form').hidden=false;el('work-id').value='w';el('media-usage').value='';
 const window={TutuMedia:media,TutuMediaEditor:editor,TutuGitHub:cms,TutuPublishReady:initialized,addEventListener:(k,f)=>(events[k]??=[]).push(f)};if(forms)window.TutuFormDrafts={hasPending:()=>pending};
 const site={settings:{brand:'塗塗',lineUrl:'https://line.me/'},gallery:[{id:'w',title:'作品',image:'assets/works/a.png'},{id:'other',title:'另外',image:'assets/works/b.png'}],news:[],characters:[],festivals:[]};
 const context={window,site,document:{getElementById:el,createTextNode:String,createElement:tag=>{const x=make(tag);created.push(x);return x;}},$:s=>el(s.slice(1)),$$:s=>s==='[data-media-picker]'?[trigger]:[],safeImg:String,Option:function(text,value){this.text=text;this.value=value},TextEncoder,MutationObserver:class{observe(){}},Event,Image:class{set src(v){this.naturalWidth=100;this.naturalHeight=80;queueMicrotask(()=>this.onload());}},checkFestivalFile(){},compressImage:convert,toast(){},saveLocal:()=>{saved++;return true},releaseFestivalPreview(){},confirm:()=>true};
 vm.runInNewContext(fs.readFileSync(__dirname+'/admin-media.js','utf8'),context);
 return {el,created,trigger,context,window,events,queued,get saved(){return saved},emit:k=>(events[k]||[]).forEach(f=>f({}))};
}
test('rapid cancel/reopen does not let a queued old dialog-close event discard the current picker target',()=>{
 const h=harness();h.trigger.onclick();h.el('media-picker-close').onclick();h.trigger.onclick();h.queued.splice(0).forEach(f=>f());
 const button=h.created.filter(x=>x.attrs['aria-label']==='選用素材 作品').at(-1);button.onclick();assert.equal(h.el('work-existing-image').value,'assets/works/a.png');assert.equal(h.el('media-picker-dialog').open,false);assert.equal(h.saved,0);
});
test('library bulk selection is reduced to visible search rows before modifying metadata',()=>{
 const h=harness();h.el('media-select-all').onchange({target:{checked:true}});h.el('media-search').value='另外';h.el('media-search').dispatchEvent({type:'input'});assert.equal(h.el('media-selected-count').textContent,'已勾選 1 張');h.el('media-batch-category').value='測試';h.el('media-batch-apply').onclick();assert.equal(h.context.site.mediaLibrary.length,1);assert.equal(h.context.site.mediaLibrary[0].image,'assets/works/b.png');assert.equal(h.context.site.gallery[1].category,undefined);assert.equal(h.saved,1);
});
test('missing initialization or unfinished forms disable library mutations and async upload locks the dashboard',async()=>{
 for(const options of [{forms:false},{initialized:false},{pending:true}]){const h=harness(options);assert.equal(h.el('media-upload').disabled,true);}
 let resolve;const h=harness({convert:()=>new Promise(r=>resolve=r)});h.el('media-files').files=[{name:'uploaded.png'}];const operation=h.el('media-upload-form').onsubmit({preventDefault(){}});assert.equal(h.el('dashboard').inert,true);assert.equal(h.el('content').attrs['aria-busy'],'true');let prevented=false;h.events.beforeunload[0]({preventDefault(){prevented=true}});assert.equal(prevented,true);resolve('data:image/webp;base64,AAAA');await operation;assert.equal(h.el('dashboard').inert,false);assert.equal(h.context.site.mediaLibrary[0].width,100);assert.equal(h.saved,1);
});

const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const model=require('./festival-model.js'),content=require('./content-models.js');
function player(reduced=false){
 const nodes=new Map(),created=[],timers=new Map();let nextTimer=0;
 function element(id=''){
  const classes=new Set(),attrs={};const el={id,value:'',textContent:'',hidden:false,disabled:false,children:[],dataset:{},handlers:{},classList:{toggle(k,v){v?classes.add(k):classes.delete(k)}},setAttribute(k,v){attrs[k]=v},getAttribute:k=>attrs[k]??null,removeAttribute(k){delete attrs[k]},addEventListener(k,fn){this.handlers[k]=fn},replaceChildren(...children){this.children=children},append(...children){this.children.push(...children)},contains(target){return !!target&&nodes.has(target.id)},querySelectorAll(){return created.filter(n=>n.dataset.festivalChoice)}};
  created.push(el);return el;
 }
 const get=id=>{if(!nodes.has(id))nodes.set(id,element(id));return nodes.get(id)};
 const document={hidden:false,handlers:{},querySelector:()=>get('series'),getElementById:get,createElement:()=>element(),addEventListener(k,fn){this.handlers[k]=fn}};
 const window={TutuFestivals:model,TutuContent:content};
 const context={window,document,AbortController,matchMedia:()=>({matches:reduced,addEventListener(){}}),Option:function(text,value){return {text,value}},setInterval:fn=>{timers.set(++nextTimer,fn);return nextTimer},clearInterval:id=>timers.delete(id)};
 vm.runInNewContext(fs.readFileSync(__dirname+'/festival-player.js','utf8'),context);
 const f=(id,date)=>({id,eventDate:date,holidayName:id,title:'塗塗',subtitle:id,description:'',tags:'',image:'assets/works/009.webp',imageAlt:id,buttonText:'看作品',buttonLink:'#gallery',workIds:[],published:true});
 const site={settings:{},gallery:[],festivals:[f('a','2026-10-31'),f('b','2027-01-01')]};
 window.TutuFestivalPlayer.mount(site);return {get,site,window,document,timers,tick:()=>{for(const fn of timers.values())fn()}};
}
test('an explicit Play resumes automatic frames even when its button retains focus and pointer hover',()=>{
 const p=player();p.get('series').handlers.mouseenter();p.get('series').handlers.focusin();p.get('festival-pause').handlers.click();p.tick();assert.equal(p.get('festival-frame-count').textContent,'第 1／2 張');
 p.get('festival-pause').handlers.click();p.tick();assert.equal(p.get('festival-frame-count').textContent,'第 2／2 張');
});
test('filtering to no results clears artwork and counters while reset restores the full sequence',()=>{
 const p=player();p.get('festival-filter-year').handlers.change({target:{value:'2030'}});assert.equal(p.get('festival-display').hidden,true);assert.equal(p.get('festival-empty').hidden,false);assert.equal(p.get('festival-next').disabled,true);assert.equal(p.get('festival-frame-count').textContent,'');
 p.get('festival-reset').handlers.click();assert.equal(p.get('festival-display').hidden,false);assert.equal(p.get('festival-frame-count').textContent,'第 1／2 張');
});
test('reduced-motion preference stops automatic advance and manual navigation stays available',()=>{
 const p=player(true);p.tick();assert.equal(p.get('festival-frame-count').textContent,'第 1／2 張');p.get('festival-next').handlers.click();assert.equal(p.get('festival-frame-count').textContent,'第 2／2 張');
});
test('mounting the player again replaces the prior timer and hidden documents do not advance',()=>{
 const p=player();p.window.TutuFestivalPlayer.mount(p.site);assert.equal(p.timers.size,1);p.document.hidden=true;p.tick();assert.equal(p.get('festival-frame-count').textContent,'第 1／2 張');
});

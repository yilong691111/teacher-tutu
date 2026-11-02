const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const mount=fs.existsSync(__dirname+'/admin-mobile.js')?require('./admin-mobile.js'):()=>{};
function fixture({allow=true}={}){
 const observers=[];let focused=false,scrolled=false;
 const node=(tag,text='')=>({tagName:tag.toUpperCase(),textContent:text,value:'',children:[],attrs:{},listeners:{},colSpan:1,
  setAttribute(k,v){this.attrs[k]=String(v);},getAttribute(k){return this.attrs[k]??null;},removeAttribute(k){delete this.attrs[k];},
  append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;},addEventListener(k,f){this.listeners[k]=f;},focus(){focused=true;}});
 const select=node('select'),heading=node('h1','管理總覽');
 const buttons=['overview','reports','media'].map((page,i)=>{const b=node('button',['◈　總覽','▤　特別報導','▧　圖片素材庫'][i]);b.dataset={page};b.selected=i===0;b.disabled=false;b.classList={contains:c=>c==='selected'&&b.selected};b.click=()=>{if(!allow||b.disabled)return;buttons.forEach(x=>x.selected=x===b);heading.textContent=b.textContent;};return b;});
 const headers=[node('th','文章標題'),node('th','展示狀態'),node('th','排序與操作')];
 const row=()=>({cells:[node('td','文章'),node('td','展示中'),node('td','編輯')]});
 const rows=[row()];const table={querySelectorAll:s=>s==='thead th'?headers:s==='tbody tr'?rows:[]};
 const document={getElementById:id=>({'admin-mobile-page':select,'page-title':heading}[id]||null),createElement:node,querySelectorAll:s=>s==='.side nav button[data-page]'?buttons:s==='.table-scroll table'?[table]:[]};
 const window={matchMedia:()=>({matches:true}),scrollTo:()=>scrolled=true,MutationObserver:class{constructor(callback){this.callback=callback;observers.push(this);}observe(target){this.target=target;}}};
 mount(document,window);
 return {select,heading,buttons,headers,rows,row,table,observers,get focused(){return focused;},get scrolled(){return scrolled;}};
}
test('mobile menu exposes every existing management destination and keeps the current page selected',()=>{
 const f=fixture();assert.deepEqual(f.select.children.map(x=>x.value),['overview','reports','media']);assert.equal(f.select.value,'overview');
});
test('mobile navigation uses the existing editor leave guard and restores the selection on cancellation',()=>{
 const f=fixture({allow:false});f.select.value='reports';f.select.listeners.change?.();assert.equal(f.select.value,'overview');assert.equal(f.focused,false);assert.equal(f.scrolled,false);
});
test('successful mobile navigation opens the requested page and brings the page heading into view',()=>{
 const f=fixture();f.select.value='reports';f.select.listeners.change?.();assert.equal(f.buttons[1].selected,true);assert.equal(f.select.value,'reports');assert.equal(f.focused,true);assert.equal(f.scrolled,true);
});
test('quick actions and desktop navigation keep the mobile menu synchronized',()=>{
 const f=fixture();f.buttons[2].click();for(const observer of f.observers)if(observer.target===f.heading)observer.callback();assert.equal(f.select.value,'media');
});
test('record cards retain header labels and action grouping after a table is redrawn',()=>{
 const f=fixture();assert.equal(f.rows[0].cells[0].attrs['data-label'],'文章標題');assert.equal(f.rows[0].cells[2].attrs['data-mobile-actions'],'true');
 f.rows[0]=f.row();for(const observer of f.observers)if(observer.target===f.table)observer.callback();assert.equal(f.rows[0].cells[1].attrs['data-label'],'展示狀態');assert.equal(f.rows[0].cells[2].attrs['data-label'],'排序與操作');
});
test('spanning empty-state cells do not receive a misleading column label',()=>{
 const f=fixture();f.rows[0].cells[0].colSpan=3;for(const observer of f.observers)if(observer.target===f.table)observer.callback();assert.equal(f.rows[0].cells[0].getAttribute('data-label'),null);
});

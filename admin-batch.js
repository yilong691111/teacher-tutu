/* Category management and selection-scoped batch changes; all writes remain local drafts. */
(function(){
 'use strict';const model=window.TutuCategories;if(!model)return;
 const selected={gallery:new Set(),lineProducts:new Set()},config={gallery:{prefix:'work',table:'works-table',search:'admin-work-search',label:'作品'},lineProducts:{prefix:'product',table:'products-table',search:'admin-product-search',label:'LINE 貼圖'}};
 let last=null,lastLabel='';
 const busy=()=>$('.content').getAttribute('aria-busy')==='true'||$('#dashboard').inert;
 const blocked=()=>!model.mutationReady({formsReady:!!window.TutuFormDrafts,publishReady:window.TutuPublishReady===true,busy:busy(),pending:!!window.TutuFormDrafts?.hasPending()});
 function closeEditor(key){$('#'+(key==='gallery'?'work-form':'line-product-form')).hidden=true;}
 const button=(key,action,text)=>`<button type="button" class="secondary" data-bulk-key="${key}" data-bulk-action="${action}">${text}</button>`;
 function options(el,names,placeholder){const value=el.value;el.replaceChildren(...(placeholder!==undefined?[new Option(placeholder,'')]:[]),...names.map(n=>new Option(n,n)));if(names.includes(value)||value==='')el.value=value;}
 for(const [key,c] of Object.entries(config)){
  const tools=document.createElement('div');tools.className='bulk-tools';tools.id=c.prefix+'-bulk-tools';
  tools.innerHTML=`<div class="bulk-filters"><label>分類<select id="${c.prefix}-filter-category"><option value="">全部分類</option></select></label><label>展示狀態<select id="${c.prefix}-filter-status"><option value="">全部狀態</option><option value="shown">展示中</option><option value="hidden">已隱藏</option></select></label><span id="${c.prefix}-filter-count" class="muted"></span></div><div class="bulk-selection"><label class="bulk-check"><input type="checkbox" id="${c.prefix}-select-all">全選目前顯示</label><strong id="${c.prefix}-selected-count">已勾選 0 筆</strong>${button(key,'clear','取消勾選')}</div><div class="bulk-actions"><label>移到分類<select id="${c.prefix}-batch-category"><option value="">選擇目標分類</option></select></label>${button(key,'category','套用分類')}${button(key,'show','批次展示')}${button(key,'hide','批次隱藏')}${key==='gallery'?button(key,'feature','設為精選')+button(key,'unfeature','取消精選'):''}${button(key,'top','移到清單最前')}${button(key,'bottom','移到清單最後')}</div><p class="muted">只修改目前勾選的${c.label}，儲存為草稿後再預覽與發布。${key==='gallery'?'官網仍會優先顯示精選作品。':''}</p><button type="button" class="secondary" data-bulk-undo>復原最近一次草稿操作</button>`;
  $('#'+c.table).closest('.table-scroll').before(tools);
  const th=document.createElement('th');th.textContent='選取';$('#'+c.table).closest('table').querySelector('thead tr').prepend(th);
  for(const id of [c.prefix+'-filter-category',c.prefix+'-filter-status'])$('#'+id).addEventListener('change',()=>{selected[key].clear();renderList(key);});
  $('#'+c.prefix+'-select-all').onchange=e=>{selected[key]=e.target.checked?new Set(filtered(key).map(x=>x.id)):new Set();renderList(key);};
  $('#'+c.table).addEventListener('change',e=>{const input=e.target.closest('[data-bulk-select]');if(!input)return;input.checked?selected[key].add(input.value):selected[key].delete(input.value);paintLocks();});
  tools.addEventListener('click',e=>{const b=e.target.closest('[data-bulk-action]');if(!b||b.disabled)return;const action=b.dataset.bulkAction;
   if(action==='clear'){selected[key].clear();renderList(key);return;}
   const patch=action==='category'?{category:$('#'+c.prefix+'-batch-category').value}:action==='show'?{published:true}:action==='hide'?{published:false}:action==='feature'?{featured:true}:action==='unfeature'?{featured:false}:{};
   run(key,()=>model.batch(site,key,[...selected[key]],patch,['top','bottom'].includes(action)?action:''),`${c.label}批次調整 ${selected[key].size} 筆`);
  });
 }
 function filtered(key){
  const c=config[key],query=$('#'+c.search).value.trim().toLocaleLowerCase(),cat=$('#'+c.prefix+'-filter-category').value,status=$('#'+c.prefix+'-filter-status').value;
  return (site[key]||[]).filter(x=>(!cat||model.category(x,key)===cat)&&(!status||(x.published===false?'hidden':'shown')===status)&&`${x.title||''} ${model.category(x,key)} ${x.series||''} ${x.id}`.toLocaleLowerCase().includes(query));
 }
 function renderList(key){
  const c=config[key],names=model.names(site,key);options($('#'+c.prefix+'-filter-category'),names,'全部分類');options($('#'+c.prefix+'-batch-category'),names,'選擇目標分類');
  if(key==='gallery'){const el=$('#work-category'),value=el.value;options(el,names);if(!$('#work-form').hidden&&value&&!names.includes(value))el.add(new Option(value,value));el.value=names.includes(value)||!$('#work-form').hidden?value:names[0]||'';}
  else $('#product-category-options').replaceChildren(...names.map(n=>new Option(n,n)));
  const rows=filtered(key);selected[key]=new Set(model.visibleSelection([...selected[key]],rows));
  $('#'+c.table).innerHTML=rows.map(x=>`<tr><td><input type="checkbox" data-bulk-select value="${clean(x.id)}" aria-label="勾選 ${clean(x.title)}" ${selected[key].has(x.id)?'checked':''}></td><td><img src="${safeImg(x.image)}" alt=""></td><td>${clean(x.title)}<small class="muted">${clean(key==='gallery'?x.series:x.id)}</small></td><td>${clean(model.category(x,key))}</td><td><span class="status ${x.published===false?'off':''}">${x.published===false?'已隱藏':'展示中'}${key==='gallery'&&x.featured?' · 精選':''}</span></td><td>${key==='gallery'?`<button data-work-edit="${clean(x.id)}">編輯</button><button data-work-delete="${clean(x.id)}">刪除</button>`:`<button data-collection="products" data-action="up" data-id="${clean(x.id)}" aria-label="上移 ${clean(x.title)}" ${rows.length!==(site[key]||[]).length||site[key][0]?.id===x.id?'disabled':''}>↑</button><button data-collection="products" data-action="down" data-id="${clean(x.id)}" aria-label="下移 ${clean(x.title)}" ${rows.length!==(site[key]||[]).length||site[key].at(-1)?.id===x.id?'disabled':''}>↓</button><button data-collection="products" data-action="edit" data-id="${clean(x.id)}">編輯</button><button data-collection="products" data-action="delete" data-id="${clean(x.id)}">刪除</button>`}</td></tr>`).join('');
  if(key==='gallery'){$$('[data-work-edit]').forEach(b=>b.onclick=()=>editWork(b.dataset.workEdit));$$('[data-work-delete]').forEach(b=>b.onclick=()=>askDelete('works',b.dataset.workDelete));}
  $('#'+c.prefix+'-filter-count').textContent=`目前顯示 ${rows.length}／${(site[key]||[]).length} 筆`;paintLocks();
 }
 function paintLocks(){
  const lock=blocked();for(const [key,c] of Object.entries(config)){
   const rows=filtered(key),ids=selected[key];$('#'+c.prefix+'-selected-count').textContent=`已勾選 ${ids.size} 筆`;
   const all=$('#'+c.prefix+'-select-all');all.checked=rows.length>0&&rows.every(x=>ids.has(x.id));all.indeterminate=ids.size>0&&!all.checked;all.disabled=busy()||rows.length===0;
   $('#'+c.table).querySelectorAll('[data-bulk-select]').forEach(el=>el.disabled=busy());
   $('#'+c.prefix+'-bulk-tools').querySelectorAll('[data-bulk-action]').forEach(b=>b.disabled=lock||!ids.size);
  }
  let undoReady=false;if(last&&!lock){try{model.undo(site,last);undoReady=true;}catch{}}
  $$('[data-bulk-undo]').forEach(b=>b.disabled=!undoReady);
  $('#bulk-history-message').textContent=last?lastLabel+(undoReady?'；可復原最近一次草稿操作。':'；目前有其他修改或未完成編輯，無法直接復原。'):'尚無可復原的分類或批次操作。';
  $('#category-add').disabled=lock;$$('[data-category-action]').forEach(b=>b.disabled=lock||b.dataset.blocked==='true');
 }
 function run(key,transform,label){
  if(blocked()){toast('請先儲存或放棄未完成的編輯，並等待官網同步結束。',true);return false;}
  try{const before=site,next=transform();window.TutuGitHub.validateData(next);last=model.checkpoint(before,next,key);lastLabel=label;site=next;closeEditor(key);const saved=saveLocal();selected[key].clear();render();toast(saved?label+'已儲存為草稿，預覽後可發布。':'修改目前只留在此頁，請先下載備份。',!saved);return true;}catch(err){toast(err.message,true);return false;}
 }
 function renderCategories(){
  const key=$('#category-collection').value,names=model.names(site,key),items=site[key]||[];
  $('#category-list').innerHTML=names.map((n,i)=>{const matches=items.filter(x=>model.category(x,key)===n),hidden=matches.filter(x=>x.published===false).length;
   return `<tr><td><input aria-label="分類名稱 ${clean(n)}" data-category-name value="${clean(n)}" maxlength="100"></td><td>${matches.length} 筆（隱藏 ${hidden} 筆）</td><td><div class="category-actions"><button data-category-action="rename" data-name="${clean(n)}">更名</button><button data-category-action="up" data-name="${clean(n)}" data-blocked="${i===0}" aria-label="上移分類 ${clean(n)}">↑</button><button data-category-action="down" data-name="${clean(n)}" data-blocked="${i===names.length-1}" aria-label="下移分類 ${clean(n)}">↓</button><select aria-label="合併 ${clean(n)} 的目標" data-category-target><option value="">選擇合併目標</option>${names.filter(x=>x!==n).map(x=>`<option value="${clean(x)}">${clean(x)}</option>`).join('')}</select><button data-category-action="merge" data-name="${clean(n)}" data-blocked="${names.length<2}">合併</button><button data-category-action="remove" data-name="${clean(n)}" data-blocked="${matches.length>0}">刪除空分類</button></div></td></tr>`;
  }).join('');$('#category-empty').hidden=names.length>0;paintLocks();
 }
 $('#category-add-form').onsubmit=e=>{e.preventDefault();const key=$('#category-collection').value;if(run(key,()=>model.categoryAction(site,key,'add',$('#category-new-name').value),'新增分類'))$('#category-new-name').value='';};
 $('#category-collection').onchange=renderCategories;
 $('#category-list').onclick=e=>{const b=e.target.closest('[data-category-action]');if(!b||b.disabled)return;const key=$('#category-collection').value,action=b.dataset.categoryAction,from=b.dataset.name,row=b.closest('tr');
  const to=action==='rename'?row.querySelector('[data-category-name]').value:row.querySelector('[data-category-target]').value;
  if(action==='merge'&&to){const count=(site[key]||[]).filter(x=>model.category(x,key)===from).length;if(!confirm(`將「${from}」合併到「${to}」，會調整 ${count} 筆資料（包含隱藏作品）。確定合併？`))return;}
  run(key,()=>model.categoryAction(site,key,action,from,to),'分類清單調整');
 };
 $$('[data-bulk-undo]').forEach(b=>b.onclick=()=>{if(!last||blocked())return;try{const next=model.undo(site,last);window.TutuGitHub.validateData(next);site=next;closeEditor(last.key);last=null;const saved=saveLocal();render();toast(saved?'已復原最近一次草稿操作。':'復原目前只留在此頁，請先下載備份。',!saved);}catch(err){toast(err.message,true);paintLocks();}});
 window.addEventListener('tutu:publish-ready',paintLocks);window.addEventListener('tutu:form-buffer',paintLocks);new MutationObserver(paintLocks).observe($('.content'),{attributes:true,attributeFilter:['aria-busy']});
 window.TutuBulkAdmin={renderWorks:()=>renderList('gallery'),renderProducts:()=>renderList('lineProducts'),renderCategories,open:page=>{if(page==='categories')renderCategories();}};
 render();
})();

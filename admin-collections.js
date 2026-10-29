/* Editors for LINE products and character companions. */
(function(){
 'use strict';
 const model=window.TutuContent;
 if(!model||!$('#products-table'))return;
 const previews=new Map();
 const characters=()=>model.charactersFor(site);
 function clearPreview(prefix){const url=previews.get(prefix);if(url){URL.revokeObjectURL(url);previews.delete(prefix);}}
 function imagePreview(prefix,image){const img=$('#'+prefix+'-image-preview');img.src=safeImg(image);img.hidden=!image;}
 function imageOptions(prefix){
  const select=$('#'+prefix+'-gallery-image');select.replaceChildren(new Option('保留目前圖片',''));
  (site.gallery||[]).filter(w=>w.published!==false).forEach(w=>select.add(new Option(w.title,w.id)));
 }
 function actions(kind,item,index,length,disabled=false){const name=clean(item.title||item.name);return `<div class="collection-actions"><button type="button" data-collection="${kind}" data-action="up" data-id="${clean(item.id)}" aria-label="上移 ${name}" ${index===0||disabled?'disabled':''}>↑</button><button type="button" data-collection="${kind}" data-action="down" data-id="${clean(item.id)}" aria-label="下移 ${name}" ${index===length-1||disabled?'disabled':''}>↓</button><button type="button" data-collection="${kind}" data-action="edit" data-id="${clean(item.id)}">編輯</button><button type="button" data-collection="${kind}" data-action="delete" data-id="${clean(item.id)}">刪除</button></div>`;}
 function renderProducts(){
  const list=site.lineProducts||[],query=$('#admin-product-search').value.trim().toLocaleLowerCase();
  $('#products-table').innerHTML=list.map((p,index)=>({p,index})).filter(({p})=>`${p.title} ${p.category||''} ${p.id}`.toLocaleLowerCase().includes(query)).map(({p,index})=>`<tr><td><img src="${safeImg(p.image)}" alt=""></td><td>${clean(p.title)}<small class="muted">${clean(p.id)}</small></td><td>${clean(p.category||'日常')}</td><td><span class="status ${p.published===false?'off':''}">${p.published===false?'已隱藏':'展示中'}</span></td><td>${actions('products',p,index,list.length,!!query)}</td></tr>`).join('');
  $('#product-category-options').replaceChildren(...[...new Set(['萬聖節','生日祝福','12年國教七年級常用成語',...list.map(p=>p.category).filter(Boolean)])].map(value=>new Option(value,value)));
 }
 function renderCharacters(){
  const list=characters();
  $('#characters-table').innerHTML=list.map((c,index)=>`<tr><td><img src="${safeImg(c.image)}" alt=""></td><td>${clean(c.name)}</td><td class="collection-description">${clean(c.description||'')}</td><td><span class="status ${c.published===false?'off':''}">${c.published===false?'已隱藏':'展示中'}</span></td><td>${actions('characters',c,index,list.length)}</td></tr>`).join('');
  $('#character-series-options').replaceChildren(...[...new Set((site.gallery||[]).map(w=>w.series).filter(Boolean))].map(value=>new Option(value,value)));
 }
 function render(){renderProducts();renderCharacters();}
 function open(page){if(page==='products')renderProducts();if(page==='characters')renderCharacters();}
 function editProduct(id){
  if(window.TutuFormDrafts?.canOpen('line-product-form')===false)return false;
  const p=(site.lineProducts||[]).find(p=>p.id===id);if(id&&!p){toast('這份貼圖已不存在。',true);return false;}
  clearPreview('line-product');$('#line-product-form').reset();$('#line-product-id').value=p?.id||'';$('#line-product-existing-image').value=p?.image||'';
  for(const key of ['url','title','category','description'])$('#line-product-'+key).value=p?.[key]||'';
  $('#line-product-author').value=p?.author??'瀧ir.';$('#line-product-published').checked=p?.published!==false;
  imageOptions('line-product');imagePreview('line-product',p?.image||'');$('#product-form-heading').textContent=p?'編輯 LINE 貼圖':'新增 LINE 貼圖';$('#line-product-form').hidden=false;
  window.TutuFormDrafts?.begin('line-product-form',p?.id||'');$('#line-product-form').scrollIntoView({behavior:'smooth',block:'start'});return true;
 }
 function editCharacter(id){
  if(window.TutuFormDrafts?.canOpen('character-form')===false)return false;
  const c=characters().find(c=>c.id===id);if(id&&!c){toast('這位角色已不存在。',true);return false;}
  clearPreview('character');$('#character-form').reset();$('#character-id').value=c?.id||'';$('#character-existing-image').value=c?.image||'';
  for(const [key,input] of [['name','name'],['description','description'],['imageAlt','image-alt'],['link','link'],['linkText','link-text'],['gallerySeries','gallery-series']])$('#character-'+input).value=c?.[key]||'';
  $('#character-published').checked=c?.published!==false;imageOptions('character');imagePreview('character',c?.image||'');$('#character-form-heading').textContent=c?'編輯人物夥伴':'新增人物夥伴';$('#character-form').hidden=false;
  window.TutuFormDrafts?.begin('character-form',c?.id||'');$('#character-form').scrollIntoView({behavior:'smooth',block:'start'});return true;
 }
 async function editorImage(prefix){
  const file=$('#'+prefix+'-file').files[0];let image=$('#'+prefix+'-existing-image').value;
  if(file){checkFestivalFile(file);image=await (window.TutuFormDrafts?.imageFor(file)||compressImage(file));}
  if(!image)throw new Error('請先從相簿選圖或上傳圖片。');return image;
 }
 function persist(key,list,formId){window.TutuGitHub.validateData({...site,[key]:list});site[key]=list;return formId?saveFormDraft(formId):saveLocal();}
 function bindImage(prefix){
  $('#'+prefix+'-gallery-image').addEventListener('change',e=>{
   const w=(site.gallery||[]).find(w=>w.id===e.target.value);if(!w)return;
   clearPreview(prefix);$('#'+prefix+'-file').value='';$('#'+prefix+'-existing-image').value=w.image;imagePreview(prefix,w.image);
   if(prefix==='character')$('#character-image-alt').value=w.title;
  });
  $('#'+prefix+'-file').addEventListener('change',e=>{
   clearPreview(prefix);const file=e.target.files[0];if(!file){imagePreview(prefix,$('#'+prefix+'-existing-image').value);return;}
   try{checkFestivalFile(file);const url=URL.createObjectURL(file);previews.set(prefix,url);$('#'+prefix+'-gallery-image').value='';const img=$('#'+prefix+'-image-preview');img.src=url;img.hidden=false;}
   catch(err){e.target.value='';imagePreview(prefix,$('#'+prefix+'-existing-image').value);toast(err.message,true);}
  });
 }
 function finishSave(formId,message,saved){
  if(saved){$('#'+formId).hidden=true;render();toast(message+'已儲存為草稿，可預覽後發布。');}
  else toast('修改目前只保留於此頁面，請保持頁面開啟並先備份。',true);
 }
 $('#line-product-form').addEventListener('submit',async e=>{
  e.preventDefault();const button=$('#save-product');if(button.disabled)return;button.disabled=true;let release=()=>{};
  try{
   release=beginEditorSave('line-product-form');
   const id=$('#line-product-id').value,fields={};for(const key of ['url','title','author','category','description'])fields[key]=$('#line-product-'+key).value.trim();
   fields.published=$('#line-product-published').checked;fields.image=await editorImage('line-product');fields.category=fields.category||'日常';
   const next=model.saveProduct(site.lineProducts||[],id||null,fields);$('#line-product-id').value=model.productFromUrl(fields.url).id;$('#line-product-existing-image').value=fields.image;$('#line-product-file').value='';finishSave('line-product-form','LINE 貼圖',persist('lineProducts',next,'line-product-form'));
  }catch(err){toast(err.message,true);}finally{release();button.disabled=false;}
 });
 $('#character-form').addEventListener('submit',async e=>{
  e.preventDefault();const button=$('#save-character');if(button.disabled)return;button.disabled=true;let release=()=>{};
  try{
   release=beginEditorSave('character-form');
   const originalId=$('#character-id').value,fields={id:originalId||uniqueId('c',characters())};
   for(const [key,input] of [['name','name'],['description','description'],['imageAlt','image-alt'],['link','link'],['linkText','link-text'],['gallerySeries','gallery-series']])fields[key]=$('#character-'+input).value.trim();
   fields.imageAlt=fields.imageAlt||fields.name;fields.published=$('#character-published').checked;fields.image=await editorImage('character');
   const next=model.saveCharacter(characters(),originalId||null,fields);$('#character-id').value=fields.id;$('#character-existing-image').value=fields.image;$('#character-file').value='';finishSave('character-form','人物夥伴',persist('characters',next,'character-form'));
  }catch(err){toast(err.message,true);}finally{release();button.disabled=false;}
 });
 function handleTable(event){
  const button=event.target.closest('button[data-collection]');if(!button||button.disabled)return;
  const {collection,action,id}=button.dataset,key=collection==='products'?'lineProducts':'characters',list=collection==='products'?(site.lineProducts||[]):characters();
  if(action==='edit'){collection==='products'?editProduct(id):editCharacter(id);return;}
  if(window.TutuFormDrafts?.canLeave()===false)return;
  try{
   if(action==='delete'){
    const item=list.find(x=>x.id===id);if(!item||!confirm('確定從官網草稿刪除「'+(item.title||item.name)+'」？發布後才會更新官網。'))return;
    persist(key,list.filter(x=>x.id!==id));
   }else persist(key,model.moveItem(list,id,action==='up'?-1:1));
   render();toast(action==='delete'?'已從草稿刪除。':'展示順序已儲存為草稿。');
  }catch(err){toast(err.message,true);}
 }
 $('#products-table').addEventListener('click',handleTable);$('#characters-table').addEventListener('click',handleTable);$('#admin-product-search').addEventListener('input',renderProducts);
 $('#new-product').onclick=()=>editProduct();$('#new-character').onclick=()=>editCharacter();
 $('#cancel-product').onclick=()=>{if(window.TutuFormDrafts?.canOpen('line-product-form')!==false)$('#line-product-form').hidden=true;};
 $('#cancel-character').onclick=()=>{if(window.TutuFormDrafts?.canOpen('character-form')!==false)$('#character-form').hidden=true;};
 $('#preview-products').onclick=()=>{if(window.TutuFormDrafts?.allowPreview()===false)return;saveLocal();window.open('index.html?draft=1#line-catalog','_blank','noopener');};
 $('#preview-characters').onclick=()=>{if(window.TutuFormDrafts?.allowPreview()===false)return;saveLocal();window.open('index.html?draft=1#characters','_blank','noopener');};
 bindImage('line-product');bindImage('character');
 window.TutuCollectionsAdmin={render,open,editProduct,editCharacter};render();
})();

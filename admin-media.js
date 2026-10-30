/* Shared library screen; all persistent edits go through the existing draft and CMS validation. */
(function(){
 'use strict';
 const model=window.TutuMedia,editor=window.TutuMediaEditor;if(!model||!editor)return;
 let selection=new Set(),last=null,uploading=false,detail=null,detailBase='',detailInitial='',pickerTarget=null,downloadUrl=null;
 const prefixes={work:['work-form','work-id'],'line-product':['line-product-form','line-product-id'],character:['character-form','character-id'],festival:['festival-form','festival-id']};
 const busy=()=>uploading||$('.content').getAttribute('aria-busy')==='true'||$('#dashboard').inert;
 const ready=()=>model.ready({formsReady:!!window.TutuFormDrafts,publishReady:window.TutuPublishReady===true,busy:busy(),pending:!!window.TutuFormDrafts?.hasPending()});
 const rows=()=>model.catalog(site,window.TutuGitHub.FESTIVAL_DEFAULTS);
 const filters=()=>({query:$('#media-search').value,category:$('#media-category').value,usage:$('#media-usage').value});
 const fields=()=>({name:$('#media-name').value,category:$('#media-meta-category').value,alt:$('#media-alt').value});
 const dirtyDetail=()=>$('#media-detail-dialog').open&&JSON.stringify(fields())!==detailInitial;
 function categories(select,items){const value=select.value,names=[...new Set(items.map(x=>x.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-Hant'));select.replaceChildren(new Option('全部分類',''),...names.map(n=>new Option(n,n)));if(names.includes(value))select.value=value;return names;}
 const sizeText=image=>model.bytes(image)===null?'網站圖檔':`${Math.ceil(model.bytes(image)/1024)} KB`;
 function card(row,picker=false){
  const el=document.createElement('article');el.className='media-card';
  if(!picker){const label=document.createElement('label');label.className='bulk-check';const check=document.createElement('input');check.type='checkbox';check.checked=selection.has(row.image);check.setAttribute('aria-label','勾選素材 '+row.name);check.dataset.mediaSelect='';check.disabled=busy();check.onchange=()=>{check.checked?selection.add(row.image):selection.delete(row.image);paint();};label.append(check,document.createTextNode('選取'));el.append(label);}
  const cover=document.createElement('div');cover.className='media-thumb';const img=document.createElement('img');img.src=safeImg(row.image);img.alt=row.alt||row.name;img.loading='lazy';cover.append(img);
  const name=document.createElement('strong');name.textContent=row.name;const info=document.createElement('p');info.textContent=`${row.category||'未分類'} · ${sizeText(row.image)}${row.width&&row.height?` · ${row.width}×${row.height}`:''}`;
  const use=document.createElement('p');use.textContent=row.uses.length?`使用中 · ${row.uses.length} 處`:'尚未使用';const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=picker?'選用這張圖片':'查看／整理';button.setAttribute('aria-label',(picker?'選用素材 ':'查看素材 ')+row.name);button.onclick=()=>picker?choose(row.image):openDetail(row.image);if(picker){button.dataset.mediaChoose='';button.disabled=busy();}
  el.append(cover,name,info,use,button);return el;
 }
 function render(){
  const all=rows(),names=categories($('#media-category'),all);$('#media-category-options').replaceChildren(...names.map(n=>new Option(n,n)));
  selection=new Set(model.select([...selection],all,filters()));const visible=all.filter(x=>model.matches(x,filters()));$('#media-grid').replaceChildren(...visible.map(x=>card(x)));$('#media-empty').hidden=visible.length>0;
  $('#media-count').textContent=`目前顯示 ${visible.length}／${all.length} 張素材；相同圖片合併顯示。`;$('#media-storage').textContent=`網站草稿約 ${(new TextEncoder().encode(JSON.stringify(site)).length/1024/1024).toFixed(2)} MB／12 MB；瀏覽器暫存容量依裝置而異。`;
  if($('#media-picker-dialog').open)renderPicker();paint();
 }
 function paint(){
  const lock=!ready(),visible=rows().filter(x=>model.matches(x,filters()));$('#media-selected-count').textContent=`已勾選 ${selection.size} 張`;
  const all=$('#media-select-all');all.checked=visible.length>0&&visible.every(x=>selection.has(x.image));all.indeterminate=selection.size>0&&!all.checked;all.disabled=busy()||!visible.length;
  $('#media-upload').disabled=lock;$('#media-batch-apply').disabled=lock||!selection.size;$('#media-delete').disabled=lock||!selection.size||rows().filter(x=>selection.has(x.image)).some(x=>x.uses.length||!x.saved);$('#media-clear').disabled=busy()||!selection.size;
  $('#media-save').disabled=lock;let canUndo=false;if(last&&!lock){try{model.undo(site,last);canUndo=true;}catch{}}$('#media-undo').disabled=!canUndo;
  $$('[data-media-picker]').forEach(b=>b.disabled=busy()||!window.TutuFormDrafts||window.TutuPublishReady!==true);$$('[data-media-choose]').forEach(b=>b.disabled=busy());$$('[data-media-select]').forEach(b=>b.disabled=busy());
 }
 function change(next,label){
  if(!ready()){toast('請先儲存或放棄未完成的編輯，並等待同步結束。',true);return false;}
  try{window.TutuGitHub.validateData(next);last=model.checkpoint(site,next);site=next;selection.clear();const saved=saveLocal();render();toast(saved?label+'已儲存為草稿，預覽後可發布。':'修改目前只留在此頁，請先下載備份。',!saved);return true;}catch(err){toast(err.message,true);return false;}
 }
 function perform(operation,label){try{return change(operation(),label);}catch(err){toast(err.message,true);return false;}}
 function openDetail(image){
  const row=rows().find(x=>x.image===image);if(!row)return;detail=image;detailBase=JSON.stringify(site.mediaLibrary);$('#media-detail-title').textContent=row.name;$('#media-detail-image').src=safeImg(image);$('#media-detail-image').alt=row.alt||row.name;$('#media-name').value=row.name;$('#media-meta-category').value=row.category;$('#media-alt').value=row.alt;
  const info=()=>{$('#media-detail-info').textContent=`${sizeText(image)}${$('#media-detail-image').naturalWidth?` · ${$('#media-detail-image').naturalWidth}×${$('#media-detail-image').naturalHeight} px`:''} · ${row.saved?'已存入素材庫':'既有網站素材'}`;};$('#media-detail-image').onload=info;info();
  $('#media-detail-uses').replaceChildren(...(row.uses.length?row.uses:[{label:'尚未使用，可在編輯表單中選用。'}]).map(x=>{const li=document.createElement('li');li.textContent=x.label;return li;}));
  const download=$('#media-download');if(downloadUrl){URL.revokeObjectURL(downloadUrl);downloadUrl=null;}try{const blob=editor.downloadBlob(image);download.href=blob?(downloadUrl=URL.createObjectURL(blob)):image;download.removeAttribute('aria-disabled');download.textContent='下載圖片';}catch{download.removeAttribute('href');download.setAttribute('aria-disabled','true');download.textContent='圖片資料無法下載';}download.download=(row.name.replace(/[^\w\u3400-\u9fff-]/g,'_')||'tutu-image')+'.'+(image.startsWith('data:')?(image.match(/^data:image\/(\w+)/)?.[1]||'webp'):image.split('.').at(-1));
  detailInitial=JSON.stringify(fields());$('#media-detail-dialog').showModal();paint();
 }
 function closeDetail(){if(dirtyDetail()&&!confirm('尚未儲存的素材說明將放棄，確定關閉？'))return;$('#media-detail-dialog').close();detail=null;if(downloadUrl){URL.revokeObjectURL(downloadUrl);downloadUrl=null;}}
 $('#media-detail-close').onclick=closeDetail;$('#media-detail-dialog').addEventListener('cancel',e=>{e.preventDefault();closeDetail();});
 $('#media-metadata-form').onsubmit=e=>{e.preventDefault();if(detailBase!==JSON.stringify(site.mediaLibrary)){toast('素材庫已有其他修改，請關閉後重新開啟素材。',true);return;}if(perform(()=>model.save(site,detail,fields()),'素材資料')){detailInitial=JSON.stringify(fields());$('#media-detail-dialog').close();detail=null;if(downloadUrl){URL.revokeObjectURL(downloadUrl);downloadUrl=null;}}};
 for(const id of ['media-search','media-category','media-usage'])$('#'+id).addEventListener(id==='media-search'?'input':'change',render);
 $('#media-select-all').onchange=e=>{selection=e.target.checked?new Set(rows().filter(x=>model.matches(x,filters())).map(x=>x.image)):new Set();render();};$('#media-clear').onclick=()=>{selection.clear();render();};
 $('#media-batch-apply').onclick=()=>perform(()=>model.batch(site,[...selection],$('#media-batch-category').value),'素材分類');
 $('#media-delete').onclick=()=>{if(!ready()||!selection.size)return;if(confirm(`確定移除這 ${selection.size} 張未使用素材的素材庫紀錄？不會刪除 GitHub 圖檔；可復原最近一次素材操作。`))perform(()=>model.remove(site,[...selection]),'未使用素材移除');};
 $('#media-undo').onclick=()=>{if(!last||!ready())return;try{const next=model.undo(site,last);window.TutuGitHub.validateData(next);site=next;last=null;const saved=saveLocal();render();toast(saved?'已復原最近一次素材操作。':'復原只留在此頁，請先備份。',!saved);}catch(err){toast(err.message,true);paint();}};
 function dimensions(image){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve({width:img.naturalWidth,height:img.naturalHeight});img.onerror=()=>reject(new Error('無法讀取圖片尺寸'));img.src=image;});}
 $('#media-upload-form').onsubmit=async e=>{
  e.preventDefault();if(!ready()){toast('請先完成未儲存的編輯，並等待同步結束。',true);return;}const files=[...$('#media-files').files];if(!files.length||files.length>10){toast('請選擇 1–10 張圖片。',true);return;}
  const category=$('#media-upload-category').value.trim(),before=JSON.stringify(site.mediaLibrary),records=[],failures=[];let duplicates=0;const known=new Set(rows().map(x=>x.image));uploading=true;const root=$('#dashboard'),oldInert=root.inert,oldBusy=$('.content').getAttribute('aria-busy');root.inert=true;$('.content').setAttribute('aria-busy','true');paint();
  try{for(const [index,file] of files.entries()){
    $('#media-upload-status').textContent=`正在處理 ${index+1}／${files.length}：${file.name}`;
    try{checkFestivalFile(file);const image=await compressImage(file);if(known.has(image)){duplicates++;continue;}const size=await dimensions(image);records.push({image,name:(file.name.replace(/\.[^.]+$/,'').trim()||'新素材').slice(0,120),category,alt:'',...size});known.add(image);}catch(err){failures.push(`${file.name}：${err.message}`);}
   }
  }finally{uploading=false;root.inert=oldInert;if(oldBusy===null)$('.content').removeAttribute('aria-busy');else $('.content').setAttribute('aria-busy',oldBusy);paint();}
  let applied=false;if(before!==JSON.stringify(site.mediaLibrary))failures.push('素材庫已變更，這批圖片尚未加入，請重新操作。');else if(records.length)applied=perform(()=>model.add(site,records),'上傳素材');
  if(applied)$('#media-files').value='';$('#media-upload-status').textContent=`${applied?'已加入 '+records.length+' 張素材草稿':'本次沒有加入新素材'}；略過 ${duplicates} 張重複圖片。${failures.length?'\n未完成：\n'+failures.join('\n'):''}${records.length&&!applied?'\n圖片尚未加入，請檢查頁面提示後重新操作。':''}`;
 };
 function renderPicker(){const all=rows();categories($('#media-picker-category'),all);const f={query:$('#media-picker-search').value,category:$('#media-picker-category').value},visible=all.filter(x=>model.matches(x,f));$('#media-picker-grid').replaceChildren(...visible.map(x=>card(x,true)));$('#media-picker-count').textContent=visible.length?`顯示 ${visible.length} 張，可選擇使用中的圖片。`:'沒有符合條件的圖片。';}
 function openPicker(prefix){
  if(busy()||!window.TutuFormDrafts||window.TutuPublishReady!==true)return;const spec=prefixes[prefix];if(!spec||$('#'+spec[0]).hidden)return;pickerTarget={prefix,identity:$('#'+spec[1]).value};$('#media-picker-search').value='';$('#media-picker-category').value='';renderPicker();$('#media-picker-dialog').showModal();
 }
 function choose(image){
  if(busy()||!pickerTarget)return;const {prefix,identity}=pickerTarget,spec=prefixes[prefix],asset=rows().find(x=>x.image===image);if(!asset||$('#'+spec[0]).hidden||$('#'+spec[1]).value!==identity){toast('編輯項目已改變，請關閉後重新選圖。',true);return;}
  try{if(prefix==='festival')releaseFestivalPreview();editor.applyImage(document,prefix,asset);$('#media-picker-dialog').close();pickerTarget=null;toast('圖片已帶入表單，請檢查後儲存。');}catch(err){toast(err.message,true);}
 }
 $$('[data-media-picker]').forEach(b=>b.onclick=()=>openPicker(b.dataset.mediaPicker));$('#media-picker-close').onclick=()=>{$('#media-picker-dialog').close();pickerTarget=null;};$('#media-picker-dialog').addEventListener('cancel',()=>{pickerTarget=null;});
 $('#media-picker-search').oninput=renderPicker;$('#media-picker-category').onchange=renderPicker;
 window.addEventListener('tutu:form-buffer',paint);window.addEventListener('tutu:publish-ready',paint);new MutationObserver(paint).observe($('.content'),{attributes:true,attributeFilter:['aria-busy']});window.addEventListener('beforeunload',e=>{if(uploading||dirtyDetail()){e.preventDefault();e.returnValue='';}});
 window.TutuMediaAdmin={render,open:page=>{if(page==='media')render();}};render();
})();

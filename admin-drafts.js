/* Incomplete inputs are kept separate from the publishable site draft. */
(function(){
 'use strict';
 const api=window.TutuFormBuffers;if(!api||!$('#form-recovery'))return;
 const store=new api.Store(localStorage),states=new Map(),imageCache=new WeakMap(),pendingImages=new Set(),pendingSaves=new Set();
 const pages={'work-form':'gallery','news-form':'news','settings-form':'settings','festival-form':'festivals','line-product-form':'products','character-form':'characters'};
 const labels={'work-form':'作品','news-form':'公告','settings-form':'網站設定','festival-form':'節慶系列','line-product-form':'LINE 貼圖','character-form':'人物夥伴'};
 const idFields={'festival-form':'festival-id','work-form':'work-id','news-form':'news-id','line-product-form':'line-product-id','character-form':'character-id'};
 const imageFields={
  'work-form':{file:'work-file',value:'work-existing-image',preview:'work-image-preview',error:'work-image-error',warning:'work-image-warning',cancel:'work-cancel-image'},
  'festival-form':{file:'festival-file',value:'festival-current-image',preview:'festival-image-preview',gallery:'festival-gallery-image',error:'festival-image-error',warning:'festival-image-warning',cancel:'festival-cancel-image',source:'festival-cover-work-id'},
  'line-product-form':{file:'line-product-file',value:'line-product-existing-image',preview:'line-product-image-preview',gallery:'line-product-gallery-image',error:'line-product-image-error',warning:'line-product-image-warning',cancel:'line-product-cancel-image'},
  'character-form':{file:'character-file',value:'character-existing-image',preview:'character-image-preview',gallery:'character-gallery-image',error:'character-image-error',warning:'character-image-warning',cancel:'character-cancel-image'}
 };
 let suppress=false;
 const readValues=formId=>Object.fromEntries(api.FORM_FIELDS[formId].map(id=>{const el=document.getElementById(id);return [id,el?.type==='checkbox'?el.checked:el?.value??''];}));
 const visible=formId=>{const form=document.getElementById(formId);return !!form&&!form.hidden&&!form.closest('.page')?.hidden;};
 const activeDirty=()=>[...states.values()].some(s=>s.dirty&&!s.parked&&visible(s.formId));
 const hasImageError=()=>[...states.values()].some(s=>s.imageError&&!s.committed);
 const hasPending=()=>pendingSaves.size>0||pendingImages.size>0||hasImageError()||[...states.values()].some(s=>s.dirty)||store.all().length>0;
 function title(record){const values=record.values;return values['work-title']||values['news-title']||values['line-product-title']||values['character-name']||values['festival-subtitle']||values['settings-brand']||'尚未命名';}
 function paint(){
  const records=store.all(),count=records.length;
  $('#form-recovery').hidden=!count;
  $('#form-recovery-title').textContent=`自動暫存的編輯（${count}）`;
  const rows=records.map(record=>{
   const row=document.createElement('div');row.className='recovery-row';
   const name=document.createElement('span');name.textContent=labels[record.formId]+'｜'+title(record);
   const resume=document.createElement('button');resume.type='button';resume.className='secondary';resume.textContent='繼續編輯';resume.disabled=$('.content').getAttribute('aria-busy')==='true';resume.onclick=()=>restore(record);
   const discard=document.createElement('button');discard.type='button';discard.className='text-button';discard.textContent='放棄暫存';discard.onclick=()=>{
    if(pendingSaves.size){toast('正在儲存編輯，請稍候。',true);return;}
    if(!confirm('確定放棄這份尚未儲存的編輯？已儲存的官網草稿不會改變。'))return;
    const s=states.get(record.formId);
    if(s?.identity===record.identity){clearTimeout(s.timer);s.committed=true;states.delete(record.formId);store.remove(record.formId,record.identity);reloadForm(record.formId,record.identity);}
    else store.remove(record.formId,record.identity);
    paint();
   };
   row.append(name,resume,discard);return row;
  });
  $('#form-recovery-list').replaceChildren(...rows);
  const failed=!store.persisted;
  $('#form-buffer-warning').hidden=!failed;
  for(const [formId,spec] of Object.entries(imageFields))document.getElementById(spec.warning).hidden=!states.get(formId)?.imageError;
  $('#editor-save-status').hidden=!pendingSaves.size;
  $('#edit-buffer-status').textContent=pendingSaves.size?'正在儲存編輯，請稍候。':hasImageError()?'圖片無法自動暫存，請重新選圖或取消本次換圖。':pendingImages.size?'圖片暫存準備中，請稍候。':failed?'暫存目前只保留於此頁面，請先下載暫存備份。':hasPending()?'輸入已自動暫存；儲存後才能預覽及發布。':'輸入內容會自動暫存；儲存後可預覽及發布。';
  window.dispatchEvent(new CustomEvent('tutu:form-buffer'));
 }
 function persistState(s){
  if(s.committed)return;
  if(s.imagePending||s.imageError){store.put(s.formId,s.identity,s.values);s.dirty=true;}
  else s.dirty=store.capture(s.formId,s.identity,s.values,s.baseValues).changed;
 }
 function makeState(formId,identity){const values=readValues(formId);return {formId,identity,values,baseValues:values,baseline:JSON.stringify(values),dirty:false,timer:null,file:null,imagePending:false,committed:false};}
 function begin(formId,identity){
  if(!api.FORM_FIELDS[formId]||!document.getElementById(formId))return;
  const old=states.get(formId);if(old){clearTimeout(old.timer);if(old.dirty)persistState(old);}
  if(imageFields[formId])document.getElementById(imageFields[formId].error).value='';
  const key=identity??(idFields[formId]?document.getElementById(idFields[formId]).value:'');states.set(formId,makeState(formId,key));paint();
 }
 function imageFor(file){if(!imageCache.has(file)){checkFestivalFile(file);imageCache.set(file,compressImage(file));}return imageCache.get(file);}
 function failImage(s,spec,err){s.imagePending=false;s.imageError=true;s.dirty=true;s.parked=false;document.getElementById(spec.error).value='1';s.values={...s.values,[spec.error]:'1'};persistState(s);toast(err.message,true);}
 function capture(formId,targetId){
  let s=states.get(formId);if(!s){begin(formId);s=states.get(formId);}if(!s)return;
  const spec=imageFields[formId],file=spec?document.getElementById(spec.file).files[0]:null;s.parked=false;
  if(spec&&((file&&s.file!==file)||(targetId===spec.gallery&&document.getElementById(spec.gallery).value)||targetId===spec.value)){s.imageError=false;document.getElementById(spec.error).value='';}
  if(!file&&s.file){pendingImages.delete(s.promise);s.file=null;s.imagePending=false;}
  s.values=readValues(formId);s.dirty=JSON.stringify(s.values)!==s.baseline||!!file||s.imagePending||s.imageError;
  if(file&&s.file!==file){
   pendingImages.delete(s.promise);s.file=file;s.imagePending=true;
   let promise;try{promise=imageFor(file);}catch(err){failImage(s,spec,err);paint();return;}
   s.promise=promise;pendingImages.add(promise);
   promise.then(image=>{
    const values=api.imageResult(s,file,spec.value,image);if(!values)return;s.values=values;s.imagePending=false;
    if(spec.source)s.values={...s.values,[spec.source]:''};
    if(states.get(formId)===s&&document.getElementById(spec.file).files[0]===file){document.getElementById(spec.value).value=image;if(spec.source)document.getElementById(spec.source).value='';const preview=document.getElementById(spec.preview);if(preview){preview.src=safeImg(image);preview.hidden=false;}s.values=readValues(formId);}
    persistState(s);
   }).catch(err=>{if(!s.committed&&s.file===file)failImage(s,spec,err);}).finally(()=>{pendingImages.delete(promise);paint();});
  }
  clearTimeout(s.timer);s.timer=setTimeout(()=>{s.timer=null;persistState(s);paint();},400);paint();
 }
 function flush(){
  for(const s of states.values()){clearTimeout(s.timer);s.timer=null;if(s.dirty)persistState(s);}store.flush();paint();return pendingImages.size===0&&store.persisted;
 }
 function canLeave(){
  if(pendingSaves.size){toast('正在儲存編輯，請稍候再切換。',true);return false;}
  if(suppress)return true;flush();
  if(hasImageError()){toast('圖片無法暫存，請重新選圖或取消本次換圖。',true);return false;}
  if(pendingImages.size){toast('圖片仍在準備暫存，請稍候再切換頁面。',true);return false;}
  if(!store.persisted&&activeDirty()){toast('這份編輯尚未成功暫存，請先儲存或下載暫存備份。',true);return false;}
  if(!activeDirty())return true;
  const allow=confirm('目前的編輯已自動暫存，但尚未儲存為可發布的草稿。確定切換或收起編輯？稍後可按「繼續編輯」還原。');
  if(allow)for(const s of states.values())if(s.dirty&&visible(s.formId))s.parked=true;
  return allow;
 }
 function canOpen(formId){if(pendingSaves.size)return canLeave();return suppress||!states.get(formId)?.dirty||canLeave();}
 function beginSave(formId){
  if(pendingSaves.size)throw new Error('正在儲存其他編輯，請稍候。');
  if(states.get(formId)?.imageError)throw new Error('請先重新選圖或取消本次換圖，再儲存。');
  flush();const releaseControls=api.lockForm(document.getElementById(formId)),root=$('#dashboard'),oldInert=root.inert,oldBusy=$('.content').getAttribute('aria-busy');
  pendingSaves.add(formId);root.inert=true;$('.content').setAttribute('aria-busy','true');paint();let released=false;
  return ()=>{if(released)return;released=true;releaseControls();pendingSaves.delete(formId);root.inert=oldInert;if(oldBusy===null)$('.content').removeAttribute('aria-busy');else $('.content').setAttribute('aria-busy',oldBusy);paint();};
 }
 function saved(formId){
  const s=states.get(formId);if(!s)return;
  clearTimeout(s.timer);s.committed=true;store.remove(formId,s.identity);const identity=idFields[formId]?document.getElementById(idFields[formId]).value:s.identity;states.set(formId,makeState(formId,identity));paint();
 }
 function reloadForm(formId,identity){
  suppress=true;
  try{
   if(formId==='work-form')editWork((site.gallery||[]).some(x=>x.id===identity)?identity:undefined);
   else if(formId==='news-form')editNews((site.news||[]).some(x=>x.id===identity)?identity:undefined);
   else if(formId==='line-product-form')window.TutuCollectionsAdmin.editProduct((site.lineProducts||[]).some(x=>x.id===identity)?identity:undefined);
   else if(formId==='character-form')window.TutuCollectionsAdmin.editCharacter(window.TutuContent.charactersFor(site).some(x=>x.id===identity)?identity:undefined);
   else if(formId==='festival-form')window.TutuFestivalsAdmin.edit(window.TutuFestivals.festivalsFor(site,window.TutuGitHub.FESTIVAL_DEFAULTS).some(x=>x.id===identity)?identity:undefined);
   else if(formId==='settings-form')renderSettings();
  }finally{suppress=false;}
 }
 function restore(record){
  if(pendingSaves.size){toast('正在儲存編輯，請稍候。',true);return;}
  if($('.content').getAttribute('aria-busy')==='true'){toast('正在同步官網，請稍候再還原暫存。',true);return;}
  if(!canLeave())return;const latest=store.get(record.formId,record.identity);if(!latest)return;
  const restoreIdentity=record.formId==='festival-form'?window.TutuFestivals.recoveryId(site,latest):record.identity;
  suppress=true;try{showPage(pages[record.formId]);reloadForm(record.formId,restoreIdentity);}finally{suppress=false;}
  const formId=record.formId,idField=idFields[formId],targetIdentity=idField?document.getElementById(idField).value:'';
  for(const [id,value] of Object.entries(latest.values)){
   const el=document.getElementById(id);if(!el||id===idField||id==='festival-origin-id')continue;
   if(el.type==='checkbox')el.checked=value===true;else el.value=String(value);
  }
  if(formId==='festival-form')window.TutuFestivalsAdmin.syncSelection();
  const spec=imageFields[formId];if(spec){document.getElementById(spec.file).value='';const image=document.getElementById(spec.value).value,preview=document.getElementById(spec.preview);if(preview){preview.src=safeImg(image);preview.hidden=!image;}}
  const s=states.get(formId);s.identity=record.identity;s.dirty=true;s.imageError=!!spec&&document.getElementById(spec.error).value==='1';s.values=readValues(formId);persistState(s);paint();
  document.getElementById(formId).scrollIntoView({behavior:'smooth',block:'start'});
  const wasExisting=record.formId==='festival-form'?latest.values['festival-origin-id']:record.identity;
  toast(targetIdentity!==record.identity&&wasExisting?'原項目已刪除，已還原為新增表單；儲存後會建立新項目。':'已還原暫存編輯，請檢查後按儲存。');
 }
 function allowPreview(){flush();if(hasPending()){toast('還有尚未儲存的編輯，請先儲存或放棄暫存，再預覽。',true);return false;}return true;}
 function importBackup(data){
  if(pendingSaves.size)throw new Error('正在儲存編輯，請稍候再匯入。');
  if(data?.format!=='tutu-form-buffers-v1')return false;
  if(!Array.isArray(data.records)||data.records.some(r=>!Object.hasOwn(api.FORM_FIELDS,r.formId)||typeof r.identity!=='string'||!/^[\w-]{0,100}$/.test(r.identity)||!r.values||typeof r.values!=='object'))throw new Error('暫存備份格式不正確。');
  for(const r of data.records)store.put(r.formId,r.identity,r.values);paint();toast('暫存備份已匯入，請選擇「繼續編輯」。');return true;
 }
 document.addEventListener('input',e=>{const formId=e.target.closest('form')?.id;if(api.FORM_FIELDS[formId])capture(formId,e.target.id);});
 document.addEventListener('change',e=>{const formId=e.target.closest('form')?.id;if(api.FORM_FIELDS[formId])capture(formId,e.target.id);});
 $('#export-form-buffers').onclick=()=>{flush();download('teacher-tutu-unfinished-edits.json',JSON.stringify({format:'tutu-form-buffers-v1',records:store.all()},null,2),'application/json;charset=utf-8');};
 addEventListener('beforeunload',e=>{flush();if(activeDirty()||pendingSaves.size||pendingImages.size||hasImageError()||!store.persisted){e.preventDefault();e.returnValue='';}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)flush();});
 new MutationObserver(paint).observe($('.content'),{attributes:true,attributeFilter:['aria-busy']});
 for(const [formId,spec] of Object.entries(imageFields))document.getElementById(spec.cancel).onclick=()=>{
  if(pendingSaves.size)return;const s=states.get(formId);if(!s)return;
  pendingImages.delete(s.promise);s.file=null;s.imagePending=false;s.imageError=false;s.parked=false;document.getElementById(spec.file).value='';document.getElementById(spec.error).value='';
  const image=document.getElementById(spec.value).value,preview=document.getElementById(spec.preview);if(preview){preview.src=safeImg(image);preview.hidden=!image;}
  s.values=readValues(formId);persistState(s);paint();
 };
 window.TutuFormDrafts={begin,saved,canLeave,canOpen,hasPending,flush,imageFor,allowPreview,importBackup,beginSave};
 for(const formId of Object.keys(api.FORM_FIELDS))begin(formId);
 paint();
})();

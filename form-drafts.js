/* Per-record temporary form buffers. Credentials are not part of the allowlist. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TutuFormBuffers=api;})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const PREFIX='teacher-tutu-form-buffer-v1:';
 const FORM_FIELDS=Object.freeze({
  'work-form':['work-id','work-existing-image','work-title','work-category','work-series','work-description','work-published','work-featured','work-image-error'],
  'report-form':["report-id", "report-origin-id", "report-title", "report-subtitle", "report-label", "report-summary", "report-body", "report-closing", "report-button-text", "report-button-link", "report-published", "report-section-1-label", "report-section-1-title", "report-section-1-body", "report-section-2-label", "report-section-2-title", "report-section-2-body", "report-section-3-label", "report-section-3-title", "report-section-3-body"],
  'news-form':['news-id','news-title','news-date','news-category','news-body','news-published'],
  'settings-form':['settings-brand','settings-brandEn','settings-tagline','settings-lineUrl','settings-heroDescription','settings-storyText','settings-siteNotice'],
  'festival-form':['festival-id','festival-origin-id','festival-cover-work-id','festival-date','festival-holiday-name','festival-work-ids','festival-published','festival-title','festival-subtitle','festival-description','festival-tags','festival-current-image','festival-image-alt','festival-button-text','festival-button-link','festival-image-error'],
  'line-product-form':['line-product-id','line-product-existing-image','line-product-url','line-product-title','line-product-author','line-product-category','line-product-description','line-product-published','line-product-image-error'],
  'character-form':['character-id','character-existing-image','character-name','character-description','character-image-alt','character-link-text','character-link','character-gallery-series','character-published','character-image-error']
 });
 function sanitize(formId,values){
  if(!Object.hasOwn(FORM_FIELDS,formId))throw new Error('不支援這個表單的暫存。');
  return Object.fromEntries(FORM_FIELDS[formId].filter(key=>typeof values?.[key]==='string'||typeof values?.[key]==='boolean').map(key=>[key,values[key]]));
 }
 function recordKey(formId,identity){if(!Object.hasOwn(FORM_FIELDS,formId)||typeof identity!=='string'||!/^[\w-]{0,100}$/.test(identity))throw new Error('暫存表單識別碼不正確。');return PREFIX+formId+':'+identity;}
 class Store{
  constructor(storage){this.storage=storage;this.pending=new Map();this.cached=new Map();this.readFailed=false;}
  get persisted(){return this.pending.size===0&&!this.readFailed;}
  all(){
   const records=new Map();
   try{
    for(let i=0;i<this.storage.length;i++){
     const key=this.storage.key(i);if(typeof key!=='string'||!key.startsWith(PREFIX))continue;
     try{const r=JSON.parse(this.storage.getItem(key));if(!r||key!==recordKey(r.formId,r.identity)||!r.values||typeof r.updatedAt!=='number')continue;records.set(key,{formId:r.formId,identity:r.identity,values:sanitize(r.formId,r.values),updatedAt:r.updatedAt});}catch{/* Skip invalid records only. */}
    }
    this.readFailed=false;this.cached=records;
   }catch{this.readFailed=true;for(const [key,r] of this.cached)records.set(key,r);}
   for(const [key,r] of this.pending){if(r===null)records.delete(key);else records.set(key,r);}
   return [...records.values()].sort((a,b)=>b.updatedAt-a.updatedAt).map(r=>({...r,values:{...r.values}}));
  }
  get(formId,identity){recordKey(formId,identity);return this.all().find(r=>r.formId===formId&&r.identity===identity)||null;}
  put(formId,identity,values){
   const key=recordKey(formId,identity),record={formId,identity,values:sanitize(formId,values),updatedAt:Date.now()};
   this.pending.set(key,record);return this.flush();
  }
  capture(formId,identity,values,baseline){
   const changed=JSON.stringify(sanitize(formId,values))!==JSON.stringify(sanitize(formId,baseline));
   return {changed,saved:changed?this.put(formId,identity,values):this.remove(formId,identity)};
  }
  remove(formId,identity){this.pending.set(recordKey(formId,identity),null);return this.flush();}
  flush(){
   for(const [key,record] of [...this.pending]){
    try{
     if(record===null){this.storage.removeItem(key);this.cached.delete(key);}else{this.storage.setItem(key,JSON.stringify(record));this.cached.set(key,record);}
     this.pending.delete(key);
    }catch{/* Retain pending edits in page memory and let the caller warn. */}
   }
   return this.pending.size===0;
  }
 }
 function imageResult(state,file,field,image){if(state.committed||state.file!==file)return null;return {...state.values,[field]:image};}
 function lockForm(form){
  const controls=Array.from(form.querySelectorAll('input,textarea,select,button')).map(el=>[el,el.disabled]);controls.forEach(([el])=>el.disabled=true);let released=false;
  return ()=>{if(released)return;released=true;controls.forEach(([el,disabled])=>el.disabled=disabled);};
 }
 return {Store,FORM_FIELDS,PREFIX,sanitize,imageResult,lockForm};
});

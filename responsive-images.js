/* Shared public/mobile sources and local pending-image resolution. */
(function(){
 'use strict';const api=window.TutuImageAssets;if(!api)return;
 function start(doc,{site=()=>window.TUTU_BOOTSTRAP||{},draft=false}={}){
  const resolved=new WeakMap(),managed=new WeakSet();
  async function apply(img){
   const raw=img.getAttribute('src');if(raw&&!raw.startsWith('blob:')&&managed.has(img)){img.removeAttribute('srcset');img.removeAttribute('sizes');}if(!raw||raw.startsWith('blob:')||!api.isUpload(raw)||resolved.get(img)===raw)return;resolved.set(img,raw);
   let info=(site().imageAssets||[]).find(x=>x.image===raw),row=null;
   if(draft&&window.TutuImageStore){try{row=await window.TutuImageStore.get(raw);if(row)info=api.metadata(row);}catch{/* Published files still work when local storage is unavailable. */}}
   if(img.getAttribute('src')!==raw)return;
   if(info?.mobile&&info.mobile!==raw&&Number.isInteger(info.width)&&Number.isInteger(info.mobileWidth)){
    let mobile=info.mobile;if(row){const local=await window.TutuImageStore.get(info.mobile);if(local)mobile=window.TutuImageStore.objectURL(local);}
    if(img.getAttribute('src')!==raw)return;
    managed.add(img);const original=row?window.TutuImageStore.objectURL(row):raw;img.srcset=mobile+' '+info.mobileWidth+'w, '+original+' '+info.width+'w';img.sizes='(max-width: 640px) 90vw, 600px';
   }else{img.removeAttribute('srcset');img.removeAttribute('sizes');}
   if(row)img.src=window.TutuImageStore.objectURL(row);
  }
  const visit=node=>{if(node.nodeType!==1)return;if(node.matches('img'))apply(node);for(const img of node.querySelectorAll('img'))apply(img);};
  const observer=new MutationObserver(records=>{for(const record of records)if(record.type==='attributes'){resolved.delete(record.target);apply(record.target);}else for(const node of record.addedNodes)visit(node);});observer.observe(doc.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});for(const img of doc.querySelectorAll('img'))apply(img);return observer;
 }
 window.TutuResponsiveImages={start};
})();

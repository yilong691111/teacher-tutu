/* Pending images live in IndexedDB, independently of localStorage drafts. */
(function(){
 'use strict';const api=window.TutuImageAssets,cache=new Map(),urls=new Map();if(!api)return;let opening=null,published={};
 function database(){
  if(!opening)opening=new Promise((resolve,reject)=>{
   if(!window.indexedDB){reject(new Error('此瀏覽器無法獨立儲存圖片，請換用可使用網站儲存空間的瀏覽器。'));return;}
   const request=indexedDB.open('teacher-tutu-image-files-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('files',{keyPath:'path'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('圖片儲存空間無法開啟，原圖片已保留。'));request.onblocked=()=>reject(new Error('圖片資料庫被舊分頁占用，請關閉舊分頁後重試。'));
  }).catch(error=>{opening=null;throw error;});return opening;
 }
 async function get(path){if(cache.has(path))return cache.get(path);const db=await database();return new Promise((resolve,reject)=>{const request=db.transaction('files','readonly').objectStore('files').get(path);request.onsuccess=()=>{if(request.result)cache.set(path,request.result);resolve(request.result)};request.onerror=()=>reject(new Error('圖片讀取失敗，請從完整備份還原。'));});}
 async function put(row){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(row);tx.oncomplete=()=>{cache.set(row.path,row);resolve(row)};tx.onerror=tx.onabort=()=>reject(new Error('圖片未能儲存，儲存空間可能不足。原圖片已保留。'));});}
 const blobFor=row=>new Blob([api.bytes(row.content)],{type:row.mime});
 function objectURL(row){if(!urls.has(row.path))urls.set(row.path,URL.createObjectURL(blobFor(row)));return urls.get(row.path);}
 async function stage(data){
  const row=await api.record(data),existing=await get(row.path);if(existing)return row.path;
  const bitmap=await createImageBitmap(blobFor(row));try{
   row.width=bitmap.width;row.height=bitmap.height;
   if(Math.max(bitmap.width,bitmap.height)>640){
    const factor=640/Math.max(bitmap.width,bitmap.height),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*factor));canvas.height=Math.max(1,Math.round(bitmap.height*factor));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
    const mobileData=canvas.toDataURL('image/webp',.8),mobile=await api.record(mobileData);mobile.path=row.path.replace(/\.(webp|png|jpg)$/,'-mobile.'+(mobile.mime==='image/jpeg'?'jpg':mobile.mime.slice(6)));row.mobile=mobile.path;row.mobileWidth=canvas.width;row.mobileHeight=canvas.height;await put(mobile);
   }else{row.mobile=row.path;row.mobileWidth=row.width;row.mobileHeight=row.height;}
   await put(row);objectURL(row);return row.path;
  }finally{bitmap.close();}
 }
 async function getOrFetch(path,data){
  const local=await get(path);if(local)return local;if(!api.isUpload(path))throw new Error('圖片路徑不正確。');
  const response=await fetch(path,{credentials:'omit',cache:'no-store'});if(!response.ok)throw new Error('圖片尚未發布或下載失敗，無法完成備份。');
  const mime=path.endsWith('.png')?'image/png':path.endsWith('.jpg')?'image/jpeg':'image/webp',row={path,mime,content:api.base64(new Uint8Array(await response.arrayBuffer()))};
  const info=(data.imageAssets||[]).find(x=>x.image===path);if(info)Object.assign(row,Object.fromEntries(Object.entries(info).filter(([k])=>k!=='image')));return row;
 }
 const store={get,put,stage,getOrFetch,objectURL,cachedURL:path=>cache.has(path)?objectURL(cache.get(path)):null,prepare:async(data,remote)=>{const images=await api.prepare(data,remote,store),pdfs=window.TutuColoringFiles?await window.TutuColoringFiles.prepare(images.data,remote):{files:[]};return {data:images.data,files:[...images.files,...pdfs.files]};},backup:async data=>{const bundle=await api.backup(data,store);if(window.TutuColoringFiles)bundle.coloringAssets=await window.TutuColoringFiles.backupFiles(data);return bundle;},restore:async data=>{if(data?.coloringAssets!==undefined&&window.TutuColoringFiles)await window.TutuColoringFiles.restoreFiles(data.coloringAssets);return api.restore(data,store);}};
 store.setPublished=data=>{published=data;};store.pending=data=>api.prepare(data,published,store);window.TutuImageStore=store;
})();

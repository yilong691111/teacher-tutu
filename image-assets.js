/* Content-addressed images, publication preparation and portable backups. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TutuImageAssets=api;})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const pathPattern=/^assets\/works\/upload-([a-f0-9]{64})(-mobile)?\.(webp|png|jpg)$/;
 const isUpload=value=>typeof value==='string'&&pathPattern.test(value);
 const isData=value=>typeof value==='string'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(value);
 const bytes=content=>Uint8Array.from(atob(content.replace(/\s/g,'')),c=>c.charCodeAt(0));
 const base64=data=>{let result='';for(let n=0;n<data.length;n+=32768)result+=String.fromCharCode(...data.subarray(n,n+32768));return btoa(result);};
 const digest=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),n=>n.toString(16).padStart(2,'0')).join('');
 async function record(data){if(!isData(data))throw new Error('圖片格式不正確。');const mime=data.slice(5,data.indexOf(';')),content=data.split(',')[1].replace(/\s/g,''),binary=bytes(content);if(binary.length>15*1024*1024)throw new Error('圖片超過 15 MB。');return {path:'assets/works/upload-'+await digest(binary)+'.'+(mime==='image/jpeg'?'jpg':mime.slice(6)),content,mime};}
 function strings(data,skipManifest=true){const result=new Set();const visit=value=>{if(typeof value==='string'){if(isUpload(value)||isData(value))result.add(value);}else if(value&&typeof value==='object')for(const [key,child] of Object.entries(value))if(!skipManifest||key!=='imageAssets')visit(child);};visit(data);return result;}
 function replace(data,mapping){if(typeof data==='string')return mapping.get(data)||data;if(Array.isArray(data))return data.map(x=>replace(x,mapping));if(data&&typeof data==='object')return Object.fromEntries(Object.entries(data).map(([k,v])=>[k,replace(v,mapping)]));return data;}
 const metadata=row=>({image:row.path,...Object.fromEntries(['width','height','mobile','mobileWidth','mobileHeight'].filter(k=>row[k]!==undefined).map(k=>[k,row[k]]))});
 function validate(site){
  if(site.imageAssets===undefined)return site;if(!Array.isArray(site.imageAssets)||site.imageAssets.length>1500)throw new Error('圖片檔案清單格式不正確。');
  const seen=new Set();for(const item of site.imageAssets){if(!item||!isUpload(item.image)||seen.has(item.image)||item.mobile!==undefined&&!isUpload(item.mobile))throw new Error('圖片檔案路徑不正確或重複。');seen.add(item.image);for(const key of ['width','height','mobileWidth','mobileHeight'])if(item[key]!==undefined&&(!Number.isInteger(item[key])||item[key]<1||item[key]>20000))throw new Error('圖片尺寸不正確。');}return site;
 }
 async function prepare(data,remote,store){
  const mapping=new Map();for(const image of strings(data))if(isData(image))mapping.set(image,await store.stage(image));
  const next=replace(data,mapping),known=strings(remote),oldManifest=new Map((remote.imageAssets||[]).map(x=>[x.image,x])),ownManifest=new Map((next.imageAssets||[]).map(x=>[x.image,x])),manifest=[],files=new Map();
  for(const path of strings(next))if(isUpload(path)){
   if(known.has(path)||oldManifest.has(path)){const info=oldManifest.get(path)||ownManifest.get(path);if(info)manifest.push(info);continue;}
   const row=await store.get(path);if(!row)throw new Error('找不到尚未發布的圖片，圖片可能已遺失。請匯入包含圖片的完整備份再發布。');
   if(!isUpload(row.path)||typeof row.content!=='string')throw new Error('圖片備份資料不正確。');files.set(path,row);manifest.push(metadata(row));
   if(row.mobile&&row.mobile!==path){const mobile=await store.get(row.mobile);if(!mobile)throw new Error('找不到手機尺寸圖片，請重新上傳原圖片。');files.set(row.mobile,mobile);}
  }
  if(manifest.length||next.imageAssets!==undefined)next.imageAssets=manifest;validate(next);return {data:next,files:[...files.values()]};
 }
 async function backup(data,store){
  const files=new Map();for(const path of strings(data))if(isUpload(path)){
   const row=await (store.getOrFetch?store.getOrFetch(path,data):store.get(path));if(!row)throw new Error('找不到備份需要的圖片，請保持原裝置的草稿或重新上傳。');files.set(row.path,row);
   if(row.mobile&&row.mobile!==row.path){const mobile=await(store.getOrFetch?store.getOrFetch(row.mobile,data):store.get(row.mobile));if(!mobile)throw new Error('手機圖片無法備份，請稍後重試。');files.set(mobile.path,mobile);}
  }
  return data.format==='tutu-form-buffers-v1'?{...structuredClone(data),assets:[...files.values()]}:{format:'tutu-site-backup-v2',data:structuredClone(data),assets:[...files.values()]};
 }
 async function restore(bundle,store){
  if(bundle?.format!=='tutu-site-backup-v2'&&bundle?.format!=='tutu-form-buffers-v1')return bundle;
  if(bundle.assets!==undefined){
   if(!Array.isArray(bundle.assets)||bundle.assets.length>3000)throw new Error('圖片備份格式不正確。');
   for(const row of bundle.assets){if(!row||!isUpload(row.path)||!['image/webp','image/png','image/jpeg'].includes(row.mime)||typeof row.content!=='string'||!/^[A-Za-z0-9+/=\r\n]+$/.test(row.content)||bytes(row.content).length>15*1024*1024||row.mobile!==undefined&&!isUpload(row.mobile))throw new Error('圖片備份路徑或內容不正確。');const match=pathPattern.exec(row.path);if(!match[2]&&await digest(bytes(row.content))!==match[1])throw new Error('圖片備份內容與檔名不符。');}
   for(const row of bundle.assets)await store.put(row);
  }
  return bundle.format==='tutu-site-backup-v2'?structuredClone(bundle.data):bundle;
 }
 return {isUpload,isData,bytes,base64,digest,record,strings,replace,metadata,validate,prepare,backup,restore};
});

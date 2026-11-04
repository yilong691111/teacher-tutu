/* PDF files are content addressed and are never embedded in localStorage. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TutuColoringAssets=api;})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';const MAX_BYTES=50*1024*1024;
 const validPath=p=>typeof p==='string'&&/^assets\/coloring\/upload-[a-f0-9]{64}\.pdf$/.test(p);
 const base64=data=>{let s='';for(let i=0;i<data.length;i+=32768)s+=String.fromCharCode(...data.subarray(i,i+32768));return btoa(s);};
 const bytes=content=>Uint8Array.from(atob(content),c=>c.charCodeAt(0));
 const digest=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),x=>x.toString(16).padStart(2,'0')).join('');
 async function record(input){const data=input instanceof Uint8Array?input:new Uint8Array(input);if(data.length<5||data.length>MAX_BYTES||String.fromCharCode(...data.slice(0,5))!=='%PDF-')throw new Error('著色本 PDF 格式不正確或超過 50 MB。');return {path:'assets/coloring/upload-'+await digest(data)+'.pdf',mime:'application/pdf',content:base64(data),size:data.length};}
 function paths(data){const result=new Set();function visit(x){if(validPath(x))result.add(x);else if(x&&typeof x==='object')for(const [k,v] of Object.entries(x))if(k!=='coloringAssets')visit(v);}visit(data);return result;}
 async function checked(row){if(!row||!validPath(row.path)||row.mime!=='application/pdf'||typeof row.content!=='string'||row.content.length>Math.ceil(MAX_BYTES/3)*4||!/^[A-Za-z0-9+/]+={0,2}$/.test(row.content))throw new Error('著色本 PDF 備份格式不正確。');const copy=await record(bytes(row.content));if(copy.path!==row.path)throw new Error('著色本 PDF 內容與檔名不符。');return copy;}
 async function prepare(data,remote,store){const known=paths(remote),files=[];for(const path of paths(data))if(!known.has(path)){const row=await store.get(path);if(!row)throw new Error('找不到尚未發布的著色本 PDF，請在原裝置發布或匯入完整備份。');files.push(await checked(row));}return {data,files};}
 async function backupFiles(data,store){const result=[];for(const path of paths(data)){const row=await store.getOrFetch(path);if(!row)throw new Error('找不到備份需要的著色本 PDF。');result.push(await checked(row));}return result;}
 async function restoreFiles(rows,store){if(!Array.isArray(rows)||rows.length>300)throw new Error('著色本備份數量不正確。');const checkedRows=[];for(const row of rows)checkedRows.push(await checked(row));for(const row of checkedRows)await store.put(row);}
 return {validPath,record,paths,prepare,backupFiles,restoreFiles,base64,bytes,checked};
});

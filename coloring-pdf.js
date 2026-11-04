/* Real PDF page ordering; all processing stays in the editor's browser. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./vendor/pdf-lib.min.js'):root.PDFLib);if(typeof module==='object'&&module.exports)module.exports=api;else root.TutuColoringPdf=api;})(typeof window==='undefined'?globalThis:window,function(lib){
 'use strict';const MAX_BYTES=50*1024*1024,MAX_PAGES=100;
 async function load(bytes){
  const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  if(data.byteLength<5||data.byteLength>MAX_BYTES||String.fromCharCode(...data.slice(0,5))!=='%PDF-')throw new Error('請選擇有效的 PDF，最大 50 MB。');
  try{const doc=await lib.PDFDocument.load(data);if(doc.getPageCount()<1||doc.getPageCount()>MAX_PAGES)throw new Error('頁數');return doc;}catch{throw new Error('PDF 無法開啟；請確認未加密、未損壞，且頁數為 1 至 100 頁。');}
 }
 async function inspect(bytes){return (await load(bytes)).getPageCount();}
 async function reorder(bytes,order){
  const source=await load(bytes),count=source.getPageCount();
  if(!Array.isArray(order)||order.length!==count||new Set(order).size!==count||order.some(i=>!Number.isInteger(i)||i<0||i>=count))throw new Error('頁面順序不完整或有重複頁，請重新選擇 PDF。');
  const doc=await lib.PDFDocument.create();for(const page of await doc.copyPages(source,order))doc.addPage(page);
  const result=await doc.save();if(result.byteLength>MAX_BYTES)throw new Error('排序後的 PDF 超過 50 MB。');return result;
 }
 async function fromImages(images){
  if(!images.length||images.length>MAX_PAGES)throw new Error('請選擇 1 至 100 張圖片。');
  const doc=await lib.PDFDocument.create();
  for(const item of images){const image=item.type==='image/png'?await doc.embedPng(item.bytes):item.type==='image/jpeg'?await doc.embedJpg(item.bytes):null;if(!image)throw new Error('圖片請使用 PNG 或 JPG。');const page=doc.addPage([595.276,841.89]),scale=Math.min(539.276/image.width,785.89/image.height);const width=image.width*scale,height=image.height*scale;page.drawImage(image,{x:(595.276-width)/2,y:(841.89-height)/2,width,height});}
  const result=await doc.save();if(result.byteLength>MAX_BYTES)throw new Error('圖片組成的 PDF 超過 50 MB，請減少圖片或縮小原圖。');return result;
 }
 return {inspect,reorder,fromImages};
});

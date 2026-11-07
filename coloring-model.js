/* Shared coloring-book schema. Array order is the public display/page order. */
(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(node?require('./coloring-release.js'):root.TutuColoringRelease);if(node)module.exports=api;else root.TutuColoring=api;})(typeof window==='undefined'?globalThis:window,function(release){
 'use strict';
 const categories=Object.freeze(['人物篇','合集篇']);
 const MAX_BYTES=50*1024*1024,MAX_PAGES=100;
 const validPdf=value=>typeof value==='string'&&/^assets\/coloring\/upload-[a-f0-9]{64}\.pdf$/.test(value);
 const validImage=value=>typeof value==='string'&&/^assets\/(?:works\/[\w-]+|[\w-]+)\.(?:webp|png|jpe?g)$/.test(value);
 const books=site=>Array.isArray(site?.coloringBooks)?site.coloringBooks:[];
 const visible=site=>books(site).filter(b=>b.published!==false);
 function syncNinePageEdition(local,published){
  if(!local||!release||published?.coloringRevision!==release.version||local.coloringRevision===release.version||!Array.isArray(local.coloringBooks))return local;
  const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
  const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
  const previous=new Map(release.previousBooks.map(b=>[b.id,b])),current=new Map(books(published).map(b=>[b.id,b]));
  const pdfFields=['pdf','pageCount','fileSize','pages'];
  const updated=local.coloringBooks.map(book=>{
   const before=previous.get(book.id),after=current.get(book.id);if(!before||!after)return book;
   const next={...book};
   // Keep an edited file and its page metadata together; never mix two PDFs.
   if(pdfFields.every(key=>equal(book[key],before[key])))for(const key of pdfFields)next[key]=structuredClone(after[key]);
   for(const key of ['title','description','image','category','published'])if(equal(book[key],before[key]))next[key]=structuredClone(after[key]);
   return next;
  });
  return {...local,coloringBooks:updated,coloringRevision:release.version};
 }
 function syncPublished(local,published){
  local=syncNinePageEdition(local,published);
  if(!local||!Array.isArray(local.coloringBooks)||!release?.additionsVersion||published?.coloringAdditionsRevision!==release.additionsVersion||local.coloringAdditionsRevision===release.additionsVersion)return local;
  const known=new Set(local.coloringBooks.map(book=>book.id));
  const additions=books(published).filter(book=>release.addedBookIds.includes(book.id)&&!known.has(book.id)).map(book=>structuredClone(book));
  // Adopt only this release's new books once. Preserve custom order, edits,
  // existing deletions, and a later intentional removal of the new book.
  return {...local,coloringBooks:[...local.coloringBooks,...additions],coloringAdditionsRevision:release.additionsVersion};
 }
 function validate(site){
  if(site.coloringBooks===undefined)return site;
  if(!Array.isArray(site.coloringBooks)||site.coloringBooks.length>300)throw new Error('著色本清單格式不正確，最多 300 本。');
  const ids=new Set();
  for(const b of site.coloringBooks){
   if(!b||typeof b.id!=='string'||!/^[-\w]{1,100}$/.test(b.id)||ids.has(b.id))throw new Error('著色本 ID 不正確或重複。');ids.add(b.id);
   if(typeof b.title!=='string'||!b.title.trim()||b.title.length>100)throw new Error('著色本名稱不可空白，最多 100 字。');
   if(!categories.includes(b.category))throw new Error('著色本請選擇人物篇或合集篇。');
   if(b.description!==undefined&&(typeof b.description!=='string'||b.description.length>1500))throw new Error('著色本介紹最多 1500 字。');
   if(!validPdf(b.pdf)||!validImage(b.image))throw new Error('著色本 PDF 或封面路徑不正確。');
   if(!Number.isInteger(b.fileSize)||b.fileSize<1||b.fileSize>MAX_BYTES)throw new Error('著色本 PDF 最大 50 MB。');
   if(!Number.isInteger(b.pageCount)||b.pageCount<1||b.pageCount>MAX_PAGES||!Array.isArray(b.pages)||b.pages.length!==b.pageCount)throw new Error('著色本頁數不符，支援 1 至 100 頁。');
   const pages=new Set();for(const p of b.pages){if(!p||typeof p.id!=='string'||!/^[-\w]{1,100}$/.test(p.id)||pages.has(p.id)||typeof p.title!=='string'||p.title.length>100)throw new Error('著色頁 ID 或名稱不正確。');pages.add(p.id);}
   if(b.published!==undefined&&typeof b.published!=='boolean')throw new Error('著色本展示狀態不正確。');
  }return site;
 }
 function move(list,id,offset){const next=list.slice(),i=next.findIndex(x=>x.id===id);if(i<0)throw new Error('找不到要排序的項目。');const target=Math.max(0,Math.min(next.length-1,i+offset));next.splice(target,0,next.splice(i,1)[0]);return next;}
 return {categories,MAX_BYTES,MAX_PAGES,validPdf,validImage,books,visible,validate,move,syncPublished};
});

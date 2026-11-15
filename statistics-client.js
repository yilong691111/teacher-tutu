/* Public aggregate statistics; the browser key is intentionally public, never privileged. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TutuStatistics=api;})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
 function createClient({endpoint,key,storage,randomUUID=()=>crypto.randomUUID(),fetch=globalThis.fetch,enabled=true,onChange=()=>{}}={}){
  let id=null,visitPromise=null;const pending=new Map();
  function identity(){if(id)return id;try{id=storage?.getItem('tutu-statistics-visitor-v1')}catch{}if(!UUID.test(id)){id=randomUUID();try{storage?.setItem('tutu-statistics-visitor-v1',id)}catch{}}return id;}
  async function request(body){
   if(!enabled)return null;
   try{
    const response=await fetch(endpoint,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+key,apikey:key,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),credentials:'omit',cache:'no-store',keepalive:true,signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error('Unavailable');const data=await response.json();
    if(!Number.isSafeInteger(data.visitors)||data.visitors<0||!data.downloads||typeof data.downloads!=='object'||Array.isArray(data.downloads)||Object.values(data.downloads).some(n=>!Number.isSafeInteger(n)||n<0))throw Error('Invalid totals');
    onChange(data);return data;
   }catch{return null}
  }
  async function visit(){if(!enabled)return null;if(!visitPromise)visitPromise=request({event:'visit',visitorId:identity()}).then(result=>{if(!result)visitPromise=null;return result});return visitPromise;}
  async function download(book){
   if(!enabled)return null;if(pending.has(book.id))return pending.get(book.id);
   const promise=request({event:'download',visitorId:identity(),eventId:randomUUID(),bookId:book.id,pdf:book.pdf}).finally(()=>pending.delete(book.id));pending.set(book.id,promise);return promise;
  }
  return {read:()=>request(),visit,download};
 }
 function createDownloader({fetch=globalThis.fetch,start,record}){
  const pending=new Map();
  return function download(book){
   if(pending.has(book.id))return pending.get(book.id);
   const promise=(async()=>{
    const response=await fetch(book.pdf,{credentials:'omit',signal:AbortSignal.timeout(60000)});
    if(!response.ok)throw Error('PDF 下載失敗，請稍後重試。');
    const blob=await response.blob();
    if(await blob.slice(0,5).text()!=='%PDF-')throw Error('PDF 檔案暫時無法使用，請稍後重試。');
    start(blob,book);
    // The actual file transfer never depends on the statistics service being up.
    Promise.resolve().then(()=>record(book)).catch(()=>{});
    return true;
   })().finally(()=>pending.delete(book.id));pending.set(book.id,promise);return promise;
  };
 }
 return {createClient,createDownloader};
});

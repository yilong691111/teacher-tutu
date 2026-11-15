/* Shared live totals are kept outside CMS drafts, backups and site-data.js. */
(function(){
 'use strict';
 const endpoint='https://ukcgssigwretmfgquowo.supabase.co/functions/v1/tutu-statistics';
 // Supabase's public anon token only invokes the constrained statistics endpoint.
 const key='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrY2dzc2lnd3JldG1mZ3F1b3dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ3MzUxMTksImV4cCI6MjExMDMxMTExOX0.p4PiC69jKgNFznAsfCQhIDzwxFYhuQg6iyN6iGfzuFU';
 const enabled=location.origin==='https://yilong691111.github.io'&&!draftMode;
 let storage,totals=null;try{storage=window.localStorage}catch{}
 const number=n=>n.toLocaleString('zh-TW');
 function decorateCount(element,book){
  element.dataset.bookDownloads=book.id;
  element.textContent=!enabled?'預覽不計次':totals?'已下載 '+number(totals.downloads[book.id]||0)+' 次':'下載次數 —';
  element.title='自 2026/11/15 啟用後，成功載入 PDF 並啟動下載的次數；短時間重複點擊只計一次。';
 }
 function update(data){
  totals=data;
  const visit=document.getElementById('visit-count');if(visit)visit.textContent=number(data.visitors);
  const banner=document.getElementById('site-visitors');if(banner)banner.title='自 2026/11/15 啟用後累計；同一瀏覽器計一次。';
  const total=document.getElementById('coloring-download-total');if(total)total.textContent=number(Object.values(data.downloads).reduce((a,b)=>a+b,0));
  for(const element of document.querySelectorAll('[data-book-downloads]'))decorateCount(element,{id:element.dataset.bookDownloads});
 }
 const client=window.TutuStatistics.createClient({endpoint,key,storage,enabled,onChange:update});
 const download=window.TutuStatistics.createDownloader({record:book=>client.download(book),start:(blob,book)=>{
  const url=URL.createObjectURL(new Blob([blob],{type:'application/pdf'})),a=document.createElement('a');
  a.href=url;a.download=book.title.replace(/[\\/:*?"<>|]/g,'-')+'.pdf';a.hidden=true;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }});
 document.addEventListener('click',async event=>{
  const anchor=event.target.closest('a');
  if(!enabled||!anchor||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||(!anchor.hasAttribute('data-coloring-download')&&!anchor.textContent.includes('下載')))return;
  const book=window.TutuColoring.visible(site).find(b=>anchor.href===new URL(b.pdf,location.href).href);
  if(!book)return;
  event.preventDefault();if(anchor.getAttribute('aria-busy')==='true')return;
  const label=anchor.textContent;anchor.textContent='準備下載…';anchor.setAttribute('aria-busy','true');
  try{await download(book)}catch(error){toast(error.message)}finally{anchor.textContent=label;anchor.removeAttribute('aria-busy')}
 });
 window.TutuSiteStatistics={decorateCount,refresh:()=>client.read()};
 if(!enabled){const banner=document.getElementById('site-visitors');if(banner)banner.title='草稿與本機預覽不計入統計。';return;}
 client.visit().then(result=>{if(!result){const banner=document.getElementById('site-visitors');if(banner)banner.title='統計暫時無法取得，請稍後重新整理。';}});
})();

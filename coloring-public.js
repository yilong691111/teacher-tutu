/* Download chooser. Native dialog supplies keyboard focus trapping and Escape. */
(function(){
 'use strict';const model=window.TutuColoring,dialog=document.getElementById('coloring-dialog'),trigger=document.getElementById('header-coloring');if(!model||!dialog||!trigger)return;
 const grid=document.getElementById('coloring-grid'),search=document.getElementById('coloring-search'),status=document.getElementById('coloring-result');let category='',returnFocus=null;
 function render(){
  const q=search.value.trim().toLocaleLowerCase(),list=model.visible(site).filter(b=>(!category||b.category===category)&&(!q||(b.title+' '+(b.description||'')).toLocaleLowerCase().includes(q)));
  grid.replaceChildren();status.textContent=list.length?'共有 '+list.length+' 本著色本，選一本下載開始畫畫。':'目前沒有符合條件的著色本，試試其他分類或關鍵字。';
  for(const book of list){
   const card=document.createElement('article');card.className='coloring-card';const img=document.createElement('img');img.src=model.validImage(book.image)?book.image:'assets/tutu-hero.webp';img.alt=book.title+'封面';img.loading='lazy';
   if(draftMode&&window.TutuImageStore)window.TutuImageStore.get(book.image).then(row=>{if(row&&img.isConnected)img.src=window.TutuImageStore.objectURL(row);}).catch(()=>{});
   const body=document.createElement('div');body.className='coloring-card-copy';const badge=document.createElement('small');badge.textContent=book.category+' · '+book.pageCount+' 頁 · '+(book.fileSize/1024/1024).toFixed(1)+' MB';const title=document.createElement('h3');title.textContent=book.title;const description=document.createElement('p');description.textContent=book.description||'';
   const actions=document.createElement('div');actions.className='coloring-card-actions';const download=document.createElement('a');download.className='button blue';download.textContent='下載 PDF ↓';download.download=book.title.replace(/[\\/:*?"<>|]/g,'-')+'.pdf';download.href=model.validPdf(book.pdf)?book.pdf:'#';
   const preview=document.createElement('a');preview.className='coloring-preview-link';preview.textContent='預覽 PDF ↗';preview.href=download.href;preview.target='_blank';preview.rel='noopener noreferrer';
   if(draftMode&&window.TutuColoringFiles)window.TutuColoringFiles.url(book.pdf).then(url=>{if(download.isConnected){download.href=url;preview.href=url;}}).catch(()=>{download.removeAttribute('href');preview.removeAttribute('href');});
   actions.append(download,preview);body.append(badge,title,description,actions);card.append(img,body);grid.append(card);
  }
 }
 function open(){returnFocus=document.activeElement;render();if(!dialog.open)dialog.showModal();trigger.setAttribute('aria-expanded','true');search.focus();}
 trigger.addEventListener('click',open);document.getElementById('coloring-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});dialog.addEventListener('close',()=>{trigger.setAttribute('aria-expanded','false');returnFocus?.focus();});
 for(const button of dialog.querySelectorAll('[data-coloring-category]'))button.addEventListener('click',()=>{category=button.dataset.coloringCategory;for(const b of dialog.querySelectorAll('[data-coloring-category]'))b.setAttribute('aria-pressed',String(b===button));render();});search.addEventListener('input',render);
 addEventListener('hashchange',()=>{if(location.hash==='#coloring')open();});if(location.hash==='#coloring')open();
})();

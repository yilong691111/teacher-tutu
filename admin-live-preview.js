/* Real homepage viewport, with unsaved settings sent only to this iframe. */
(function(){
 'use strict';const api=window.TutuHomepagePreview,form=document.getElementById('settings-form'),panel=document.getElementById('homepage-live-preview');if(!api||!form||!panel)return;
 const frame=document.getElementById('homepage-live-frame'),viewport=document.getElementById('homepage-live-viewport'),status=document.getElementById('homepage-live-status'),select=document.getElementById('homepage-live-slide'),token=crypto.randomUUID();
 let slide=1,device=matchMedia('(max-width:640px)').matches?'mobile':'desktop',started=false;
 function scale(){const width=device==='mobile'?390:1200,ratio=Math.min(1,viewport.clientWidth/width);frame.style.width=width+'px';frame.style.height='850px';frame.style.transform='scale('+ratio+')';viewport.style.height=(850*ratio)+'px';}
 function update(){
  window.TutuHomepageText.preview(document);select.value=String(slide);if(panel.hidden||!started)return;
  try{const data=api.message({...site.settings,...window.TutuHomepageText.read(document)},slide,token);frame.contentWindow?.postMessage(data,location.origin);status.textContent='正在預覽介紹 '+slide+' · '+(device==='mobile'?'手機 390 px':'電腦 1200 px')+' · 包含尚未儲存的編輯';}
  catch{status.textContent='目前欄位尚未填寫完整，預覽保留上一個有效內容。';}
 }
 function open(value){slide=Number(value)||slide;panel.hidden=false;if(!started){started=true;frame.src=api.url(slide,token);}scale();update();panel.scrollIntoView({behavior:'smooth',block:'nearest'});}
 frame.addEventListener('load',update);
 for(const editor of form.querySelectorAll('[id^="homepage-editor"]')){
  const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent='預覽這篇介紹（手機／電腦）';button.addEventListener('click',()=>open(api.slideForTarget(editor.id,slide)));editor.append(button);
 }
 form.addEventListener('input',event=>{const editor=event.target.closest('[id^="homepage-editor"]');if(editor)slide=api.slideForTarget(editor.id,slide);update();});
 form.addEventListener('change',update);document.getElementById('preview-homepage-copy').addEventListener('click',()=>open(slide));
 document.getElementById('homepage-live-close').onclick=()=>{panel.hidden=true;};select.addEventListener('change',()=>{slide=Number(select.value);update();});
 for(const button of panel.querySelectorAll('[data-preview-device]'))button.addEventListener('click',()=>{device=button.dataset.previewDevice;for(const b of panel.querySelectorAll('[data-preview-device]'))b.setAttribute('aria-pressed',String(b===button));scale();update();});
 for(const button of panel.querySelectorAll('[data-preview-device]'))button.setAttribute('aria-pressed',String(button.dataset.previewDevice===device));
 new ResizeObserver(scale).observe(viewport);window.addEventListener('tutu:homepage-filled',update);
})();

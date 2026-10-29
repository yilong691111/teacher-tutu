/* Date-filtered ticker and sequential artwork carousel. */
(function(){
 'use strict';
 let cleanup=()=>{};
 function mount(site,defaults){
  cleanup();const model=window.TutuFestivals,root=document.querySelector('#series');if(!model||!root)return;
  const $=id=>document.getElementById(id),controller=new AbortController(),on=(el,type,fn)=>el.addEventListener(type,fn,{signal:controller.signal});
  const all=model.festivalsFor(site,defaults),visible=model.select(all),filters={year:'',month:'',day:'',holiday:''};
  let sequence=[],index=0,running=!matchMedia('(prefers-reduced-motion: reduce)').matches,hover=false,focus=false;
  const controls=['festival-prev','festival-next','festival-pause'];
  function options(id,values,label){const select=$(id);select.replaceChildren(new Option(label,''),...values.map(v=>new Option(v,v)));}
  options('festival-filter-year',[...new Set(visible.map(f=>f.eventDate.slice(0,4)).filter(Boolean))].sort(),'全部年份');
  options('festival-filter-month',[...new Set(visible.map(f=>f.eventDate.slice(5,7)).filter(Boolean))].sort(),'全部月份');
  options('festival-filter-day',[...new Set(visible.map(f=>f.eventDate.slice(8,10)).filter(Boolean))].sort(),'全部日期');
  options('festival-filter-holiday',[...new Set(visible.map(f=>f.holidayName))].sort((a,b)=>a.localeCompare(b,'zh-Hant')),'全部節日');
  function motion(){
   root.classList.toggle('festival-paused',!running||hover||focus||document.hidden||sequence.length<2);
   $('festival-pause').textContent=running?'Ⅱ 暫停播放':'▶ 播放';$('festival-pause').setAttribute('aria-pressed',String(!running));
  }
  function show(next,announce=false){
   if(!sequence.length)return;index=model.step(next,sequence.length,0);const frame=sequence[index],f=frame.festival;
   for(const [id,key] of [['festival-title','title'],['festival-subtitle','subtitle'],['festival-description','description'],['featured-go','buttonText']])$(id).textContent=f[key]||'';
   $('festival-date-label').textContent=(f.eventDate?f.eventDate.replaceAll('-',' / '):'尚未設定日期')+' · '+f.holidayName;
   $('festival-tags').replaceChildren(...(f.tags||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(text=>{const tag=document.createElement('span');tag.textContent=text;return tag;}));
   const image=$('festival-image');if(image.getAttribute('src')!==frame.image)image.src=frame.image;image.alt=frame.imageAlt;
   $('festival-work-caption').textContent=(frame.workId?'作品｜':'系列封面｜')+frame.workTitle;
   const link=$('featured-go');link.href=window.TutuContent.safeLink(f.buttonLink)?f.buttonLink:'#gallery';if(f.buttonLink.startsWith('https:')){link.target='_blank';link.rel='noopener noreferrer';}else{link.removeAttribute('target');link.removeAttribute('rel');}
   $('festival-frame-count').textContent=`第 ${index+1}／${sequence.length} 張`;
   root.querySelectorAll('[data-festival-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.festivalChoice===f.id)));
   if(announce)$('festival-announcement').textContent=f.holidayName+'，'+frame.workTitle+'，'+$('festival-frame-count').textContent;
  }
  function rebuild(){
   $('festival-announcement').textContent='';const selected=model.select(all,filters);sequence=model.frames(selected,site.gallery||[]);index=0;const empty=!sequence.length;
   $('festival-display').hidden=empty;$('festival-empty').hidden=!empty;$('festival-ticker').hidden=empty;
   $('festival-result').textContent=`符合 ${selected.length} 個系列 · ${sequence.length} 張作品與封面 · 按日期順序播放`;
   $('festival-empty-text').textContent=visible.length?'目前沒有可播放的節慶作品，請試試其他篩選條件。':'節慶新作品準備中，敬請期待。';
   for(const id of controls)$(id).disabled=sequence.length<2;
   const group=document.createElement('div');group.className='festival-ticker-group';
   const duplicate=document.createElement('div');duplicate.className='festival-ticker-group';duplicate.setAttribute('aria-hidden','true');
   for(const f of selected.filter(f=>sequence.some(frame=>frame.festival.id===f.id))){
    const text=(f.eventDate?f.eventDate.replaceAll('-','/'):'日期待設定')+' · '+f.holidayName+'｜'+(f.subtitle||f.title);
    const button=document.createElement('button');button.type='button';button.textContent=text;button.dataset.festivalChoice=f.id;
    button.onclick=()=>show(sequence.findIndex(frame=>frame.festival.id===f.id),true);group.append(button);const copy=document.createElement('span');copy.textContent=text;duplicate.append(copy);
   }
   $('festival-ticker-track').replaceChildren(group,duplicate);if(!empty)show(0);else $('festival-frame-count').textContent='';motion();
  }
  for(const key of Object.keys(filters))on($('festival-filter-'+key),'change',e=>{filters[key]=e.target.value;rebuild();});
  on($('festival-reset'),'click',()=>{for(const key of Object.keys(filters)){filters[key]='';$('festival-filter-'+key).value='';}rebuild();});
  on($('festival-prev'),'click',()=>show(model.step(index,sequence.length,-1),true));on($('festival-next'),'click',()=>show(model.step(index,sequence.length,1),true));
  on($('festival-pause'),'click',()=>{running=!running;if(running){hover=false;focus=false;}motion();});
  on(root,'mouseenter',()=>{hover=true;motion();});on(root,'mouseleave',()=>{hover=false;motion();});
  on(root,'focusin',()=>{focus=true;motion();});on(root,'focusout',e=>{focus=root.contains(e.relatedTarget);motion();});on(document,'visibilitychange',motion);
  const preference=matchMedia('(prefers-reduced-motion: reduce)');on(preference,'change',e=>{if(e.matches)running=false;motion();});
  const timer=setInterval(()=>{if(running&&!hover&&!focus&&!document.hidden&&sequence.length>1)show(model.step(index,sequence.length,1));},6000);
  cleanup=()=>{clearInterval(timer);controller.abort();};rebuild();
 }
 window.TutuFestivalPlayer={mount};
})();

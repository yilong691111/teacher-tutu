"use strict";
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const BOOT=window.TUTU_BOOTSTRAP||{settings:{},gallery:[],news:[]};
const ADMIN_KEY='teacher-tutu-static-cms-v1';
const draftMode=new URLSearchParams(location.search).get('draft')==='1';
function getSite(){if(draftMode){try{const v2=JSON.parse(localStorage.getItem('teacher-tutu-static-cms-v2')||'null');if(v2?.data)return v2.data;const x=JSON.parse(localStorage.getItem(ADMIN_KEY)||'null');if(x)return x}catch{}}return BOOT}
let site=getSite(),newsCat='全部',heroIdx=0,heroRunning=true;
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeImage=s=>/^assets\/(?:works\/[\w-]+|[\w-]+)\.(?:webp|jpe?g|png)$/.test(s||'')||/^data:image\/(?:webp|png|jpeg);base64,/i.test(s||'')?s:'assets/tutu-hero.webp';
const formatDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')?s.replace(/-/g,'.'):safe(s);
const toast=msg=>{const el=$('#site-toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2200)};
function renderLinks(){const url=site.settings?.lineUrl||'https://store.line.me/stickershop/author/5947333/zh-Hant';const valid=/^https:\/\//.test(url)?url:'https://store.line.me/stickershop/author/5947333/zh-Hant';['header-line','quick-line','main-line','footer-line'].forEach(id=>{const el=document.getElementById(id);if(el)el.href=valid})}
function initSettings(){document.title=(site.settings.brand||'塗塗老師')+' Teacher Tutu｜官方網站';$('#notice-text').textContent=draftMode?'草稿預覽模式｜'+(site.settings.siteNotice||''):site.settings.siteNotice||'';$('#hero-description').textContent=site.settings.heroDescription||'';$('#story-description').textContent=site.settings.storyText||'';$('#year').textContent=new Date().getFullYear();renderLinks();renderLineProduct();renderFestival();renderCharacters();renderReportSharing();}
function renderReportSharing(){window.TutuArticleSharing?.mount({url:'https://yilong691111.github.io/teacher-tutu/#idiom-story',title:($('.idiom-headline')?.textContent.trim()||'聊天有梗，成語也有戲。')+'｜'+(site.settings.brand||'塗塗老師'),text:$('.idiom-lead')?.textContent.trim()||'讓孩子在聊天過程中，就能活用成語。'});}
function renderCharacters(){
 const model=window.TutuContent,container=$('#character-cards');if(!model||!container)return;
 const list=model.charactersFor(site),visible=(Array.isArray(list)?list:[]).filter(c=>c&&c.published!==false&&typeof c.name==='string');
 const cards=visible.map((c,index)=>{
  const card=document.createElement('article');card.className='char-card';card.id='character-'+c.id;
  const deco=document.createElement('span');deco.className='char-deco';deco.textContent='塗塗角色 '+String(index+1).padStart(2,'0');
  const cover=document.createElement('div');cover.className='char-image '+(c.tone==='pink'?'pink':'ice');
  const img=document.createElement('img');img.src=safeImage(c.image);img.alt=c.imageAlt||c.name;img.loading='lazy';img.style.width='92%';img.style.height='92%';cover.append(img);
  const title=document.createElement('h3');title.textContent=c.name;const description=document.createElement('p');description.textContent=c.description||'';
  card.append(deco,cover,title,description);
  if(c.linkText&&model.safeLink(c.link)){
   const link=document.createElement('a');link.className='underlink';link.textContent=c.linkText;link.href=c.link;
   if(c.link==='#gallery'){const url=new URL(location.href);url.searchParams.delete('work');url.searchParams.set('topic','daily');url.hash='line-catalog';link.href=url.toString();link.textContent='挑選校園日常貼圖 ↗';}
   else if(!c.link.startsWith('#')){link.target='_blank';link.rel='noopener noreferrer';}
   card.append(link);
  }
  return card;
 });
 if(!cards.length){const empty=document.createElement('p');empty.className='characters-empty';empty.textContent='新夥伴準備中，敬請期待。';cards.push(empty);}
 container.replaceChildren(...cards);
}
function renderFestival(){window.TutuFestivalPlayer?.mount(site,window.TutuGitHub?.FESTIVAL_DEFAULTS);}
function renderLineProduct(){window.TutuCatalogBrowser?.mount(site,{safeImage,onNavigate:syncPrimaryNav});}
function syncPrimaryNav(){const hash=location.hash.slice(1),aliases={characters:'about',line:'line-catalog',gallery:'line-catalog','featured-stickers':'line-catalog','grade7-idioms':'idiom-story','idiom-readers':'idiom-story'};const target=aliases[hash]||hash||'top';$$('.nav-item').forEach(a=>{const active=a.dataset.navTarget===target;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}

function renderNews(){let news=(site.news||[]).filter(n=>n.published!==false&&(newsCat==='全部'||n.category===newsCat)).sort((a,b)=>(b.date||'').localeCompare(a.date||''));const list=$('#news-list');list.textContent='';if(!news.length){list.innerHTML='<p style="padding:24px;color:#8193aa">目前沒有這一類的公告。</p>';return}news.slice(0,5).forEach(n=>{const b=document.createElement('button');b.className='news-row';b.type='button';b.innerHTML=`<time>${formatDate(n.date)}</time><span class="category">${safe(n.category)}</span><strong>${safe(n.title)}</strong><span class="arrow">→</span>`;b.addEventListener('click',()=>openNews(n));list.appendChild(b)})}
function openNews(n){
 $('#news-dialog-title').textContent=n.title;$('#news-dialog-category').textContent=n.category;$('#news-dialog-date').textContent=formatDate(n.date);
 const body=$('#news-dialog-body');body.textContent=n.body||'';
 const target=typeof n.link==='string'&&/^#[A-Za-z][\w-]*$/.test(n.link)?document.getElementById(n.link.slice(1)):null;
 if(target){
  const actions=document.createElement('div');actions.style.marginTop='22px';
  const link=document.createElement('a');link.className='button blue';link.href=n.link;link.textContent=typeof n.linkText==='string'&&n.linkText.trim()?n.linkText:'查看相關內容 →';
  link.addEventListener('click',()=>$('#news-dialog').close());actions.append(link);body.append(actions);
 }
 $('#news-dialog').showModal();
}
function showSlide(idx){heroIdx=(idx+3)%3;$$('.hero-slide').forEach((e,i)=>e.classList.toggle('on',i===heroIdx));$$('#hero-dots button').forEach((e,i)=>{e.classList.toggle('selected',i===heroIdx);e.setAttribute('aria-current',i===heroIdx?'true':'false')})}
function initEvents(){
$$('.tabs button').forEach(b=>b.addEventListener('click',()=>{$$('.tabs button').forEach(e=>{e.classList.remove('selected');e.setAttribute('aria-selected','false')});b.classList.add('selected');b.setAttribute('aria-selected','true');newsCat=b.dataset.news;renderNews()}));
$('#hero-prev').addEventListener('click',()=>showSlide(heroIdx-1));$('#hero-next').addEventListener('click',()=>showSlide(heroIdx+1));$$('#hero-dots button').forEach(b=>b.addEventListener('click',()=>showSlide(Number(b.dataset.go))));$('#hero-pause').addEventListener('click',()=>{heroRunning=!heroRunning;$('#hero-pause').textContent=heroRunning?'Ⅱ':'▶';$('#hero-pause').ariaLabel=heroRunning?'暫停輪播':'播放輪播'});setInterval(()=>{if(heroRunning&&!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches)showSlide(heroIdx+1)},6500);
const toggle=$('.mobile-toggle');toggle.addEventListener('click',()=>{const isOpen=$('#primary-nav').classList.toggle('open');toggle.setAttribute('aria-expanded',String(isOpen))});$$('.nav-item').forEach(a=>a.addEventListener('click',()=>{$('#primary-nav').classList.remove('open');toggle.setAttribute('aria-expanded','false')}));
$('#news-dialog-close').addEventListener('click',()=>$('#news-dialog').close());$('#news-dialog').addEventListener('click',e=>{if(e.target===$('#news-dialog'))$('#news-dialog').close()});
$('#back-top').addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));addEventListener('scroll',()=>{const max=document.documentElement.scrollHeight-innerHeight;const p=max>0?scrollY/max*100:0;$('#scroll-progress').style.width=p+'%';$('#back-top').classList.toggle('show',scrollY>600)},{passive:true});
}
function loadSite(){initSettings();renderNews();syncPrimaryNav();if(draftMode)toast('正在預覽後台草稿')}
addEventListener('hashchange',syncPrimaryNav);
initEvents();loadSite();

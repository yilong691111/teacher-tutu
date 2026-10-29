'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const BOOTSTRAP=structuredClone(window.TUTU_BOOTSTRAP||{settings:{},gallery:[],news:[]});
const draftStore=new window.TutuGitHub.DraftStore(localStorage);
let draftBaseBlob=draftStore.read()?.baseBlob||null;
let site=loadLocal()||structuredClone(BOOTSTRAP), pendingDelete=null;
const clean=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeImg=s=>/^assets\/(?:works\/[\w-]+|[\w-]+)\.(?:webp|jpe?g|png)$/.test(s||'')||/^data:image\/(?:webp|png|jpeg);base64,/i.test(s||'')?s:'assets/tutu-hero.webp';
const toast=(message,err=false)=>{const el=$('#alert');el.textContent=message;el.classList.toggle('error',err);if(message)setTimeout(()=>{if(el.textContent===message)el.textContent=''},5000);};
const saveLocal=()=>{
 let saved=true;
 try{draftStore.save(site,draftBaseBlob);}catch{saved=false;}
 const warning=document.querySelector('#draft-storage-warning');
 if(warning){warning.hidden=saved;warning.textContent=saved?'':'瀏覽器無法儲存這份草稿（可能已滿）。修改仍留在此頁，請先下載 JSON 備份或完成發布，再關閉頁面。';}
 window.dispatchEvent(new CustomEvent('tutu:draft',{detail:{saved}}));return saved;
};
function loadLocal(){return draftStore.read()?.data||null}
const pages={overview:'管理總覽',gallery:'作品相簿管理',news:'公告管理',settings:'網站設定',publish:'發布與備份'};
function showPage(p){$$('.page').forEach(e=>e.hidden=e.id!=='page-'+p);$$('.side nav button').forEach(e=>e.classList.toggle('selected',e.dataset.page===p));$('#page-title').textContent=pages[p]||'';if(p==='gallery')renderWorks();if(p==='news')renderNews();if(p==='settings')renderSettings();if(p==='publish')renderPublishChecks();}
function render(){const w=site.gallery||[],n=site.news||[];$('#stat-works').textContent=w.length;$('#stat-published').textContent=w.filter(x=>x.published!==false).length;$('#stat-news').textContent=n.length;$('#stat-categories').textContent=new Set(w.map(x=>x.category).filter(Boolean)).size;$('#mini-gallery').innerHTML=w.slice(0,18).map(x=>`<img src="${safeImg(x.image)}" alt="${clean(x.title)}">`).join('');renderWorks();renderNews();renderSettings();}
function renderWorks(){const q=($('#admin-work-search')?.value||'').trim().toLowerCase();const rows=(site.gallery||[]).filter(x=>(x.title||'').toLowerCase().includes(q));$('#works-table').innerHTML=rows.map(x=>`<tr><td><img src="${safeImg(x.image)}" alt=""></td><td>${clean(x.title)}<small style="display:block;color:#8798ad">${clean(x.series)}</small></td><td>${clean(x.category)}</td><td><span class="status ${x.published===false?'off':''}">${x.published===false?'已隱藏':'展示中'}</span></td><td><button data-work-edit="${clean(x.id)}">編輯</button><button data-work-delete="${clean(x.id)}">刪除</button></td></tr>`).join('');$$('[data-work-edit]').forEach(b=>b.onclick=()=>editWork(b.dataset.workEdit));$$('[data-work-delete]').forEach(b=>b.onclick=()=>askDelete('works',b.dataset.workDelete));}
function editWork(id){const w=(site.gallery||[]).find(x=>x.id===id);$('#work-id').value=w?.id||'';$('#work-existing-image').value=w?.image||'';$('#work-title').value=w?.title||'';$('#work-category').value=w?.category||'萬聖節';$('#work-series').value=w?.series||'塗塗的日常';$('#work-description').value=w?.description||'';$('#work-published').checked=w?.published!==false;$('#work-featured').checked=w?.featured===true;$('#work-file').value='';$('#work-form-heading').textContent=w?'編輯作品':'新增作品';$('#work-form').hidden=false;$('#work-form').scrollIntoView({behavior:'smooth',block:'start'});}
function renderNews(){$('#news-table').innerHTML=(site.news||[]).map(x=>`<tr><td>${clean(x.date)}</td><td>${clean(x.title)}</td><td>${clean(x.category)}</td><td><span class="status ${x.published===false?'off':''}">${x.published===false?'已隱藏':'展示中'}</span></td><td><button data-news-edit="${clean(x.id)}">編輯</button><button data-news-delete="${clean(x.id)}">刪除</button></td></tr>`).join('');$$('[data-news-edit]').forEach(b=>b.onclick=()=>editNews(b.dataset.newsEdit));$$('[data-news-delete]').forEach(b=>b.onclick=()=>askDelete('news',b.dataset.newsDelete));}
function editNews(id){const n=(site.news||[]).find(x=>x.id===id);$('#news-id').value=n?.id||'';$('#news-title').value=n?.title||'';$('#news-date').value=n?.date||new Date().toISOString().slice(0,10);$('#news-category').value=n?.category||'網站公告';$('#news-body').value=n?.body||'';$('#news-published').checked=n?.published!==false;$('#news-form-heading').textContent=n?'編輯公告':'新增公告';$('#news-form').hidden=false;$('#news-form').scrollIntoView({behavior:'smooth',block:'start'});}
function renderSettings(){const s=site.settings||{};['brand','brandEn','tagline','lineUrl','heroDescription','storyText','siteNotice'].forEach(k=>$('#settings-'+k).value=s[k]||'');}
function askDelete(kind,id){pendingDelete={kind,id};$('#confirm-dialog').showModal();}
function uniqueId(prefix,list){let i=Date.now().toString(36),id=prefix+i;while(list.some(x=>x.id===id)){i+='x';id=prefix+i}return id;}
function compressImage(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('圖片讀取失敗'));reader.onload=()=>{const img=new Image();img.onerror=()=>reject(new Error('圖片格式無法處理'));img.onload=()=>{const max=1400,scale=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL('image/webp',.86));};img.src=reader.result;};reader.readAsDataURL(file);});}
function download(name,text,type='text/plain;charset=utf-8'){const b=new Blob([text],{type}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function exportJS(){download('site-data.js','window.TUTU_BOOTSTRAP = '+JSON.stringify(site,null,2)+';\n','text/javascript;charset=utf-8');toast('site-data.js 已下載。請覆蓋 GitHub 的 data/site-data.js。');}
function exportJSON(){download('teacher-tutu-backup.json',JSON.stringify(site,null,2),'application/json;charset=utf-8');}
function parseImported(text,name){if(name.toLowerCase().endsWith('.json'))return JSON.parse(text);const m=text.match(/window\.TUTU_BOOTSTRAP\s*=\s*([\s\S]*?)\s*;?\s*$/);if(!m)throw new Error('找不到 TUTU_BOOTSTRAP 資料');return JSON.parse(m[1].replace(/;\s*$/,''));}
$$('.side nav button').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
$$('[data-jump]').forEach(b=>b.onclick=()=>{showPage(b.dataset.jump);if(b.dataset.jump==='gallery')editWork();if(b.dataset.jump==='news')editNews();});
$('#new-work').onclick=()=>editWork();$('#cancel-work').onclick=()=>$('#work-form').hidden=true;$('#admin-work-search').addEventListener('input',renderWorks);
$('#work-form').addEventListener('submit',async e=>{e.preventDefault();const file=$('#work-file').files[0];if(file&&!['image/png','image/jpeg','image/webp'].includes(file.type)){toast('只支援 PNG、JPG、WEBP',true);return;}if(file&&file.size>15*1024*1024){toast('原始圖片請勿超過 15 MB',true);return;}const list=site.gallery||(site.gallery=[]);const id=$('#work-id').value||uniqueId('w',list);let image=$('#work-existing-image').value||'';try{if(file)image=await compressImage(file);if(!image)throw new Error('新增作品必須選擇圖片');const obj={id,title:$('#work-title').value.trim(),category:$('#work-category').value,series:$('#work-series').value.trim(),image,description:$('#work-description').value.trim(),published:$('#work-published').checked,featured:$('#work-featured').checked};const idx=list.findIndex(x=>x.id===id);if(idx>=0)list[idx]=obj;else list.unshift(obj);saveLocal();$('#work-form').hidden=true;render();toast('作品已儲存在本機草稿。可先預覽，再到「發布與備份」更新官網。');}catch(err){toast(err.message,true)}});
$('#new-news').onclick=()=>editNews();$('#cancel-news').onclick=()=>$('#news-form').hidden=true;
$('#news-form').addEventListener('submit',e=>{e.preventDefault();const list=site.news||(site.news=[]);const id=$('#news-id').value||uniqueId('n',list);const obj={...(list.find(item=>item.id===id)||{}),id,title:$('#news-title').value.trim(),date:$('#news-date').value,category:$('#news-category').value,body:$('#news-body').value.trim(),published:$('#news-published').checked};const idx=list.findIndex(x=>x.id===id);if(idx>=0)list[idx]=obj;else list.unshift(obj);saveLocal();$('#news-form').hidden=true;render();toast('公告已儲存在本機草稿。');});
$('#settings-form').addEventListener('submit',e=>{e.preventDefault();site.settings=site.settings||{};['brand','brandEn','tagline','lineUrl','heroDescription','storyText','siteNotice'].forEach(k=>site.settings[k]=$('#settings-'+k).value.trim());saveLocal();render();toast('網站設定已儲存在本機草稿。');});
$('#cancel-delete').onclick=()=>{$('#confirm-dialog').close();pendingDelete=null;};
$('#confirm-delete').onclick=()=>{if(!pendingDelete)return;const {kind,id}=pendingDelete;const key=kind==='works'?'gallery':'news';site[key]=(site[key]||[]).filter(x=>x.id!==id);saveLocal();render();toast('已從本機草稿刪除。');$('#confirm-dialog').close();pendingDelete=null;};
$('#export-js').onclick=exportJS;$('#export-json').onclick=exportJSON;
$('#import-data').onclick=async()=>{const f=$('#import-file').files[0];if(!f){toast('請先選擇 site-data.js 或備份 JSON',true);return;}try{const data=parseImported(await f.text(),f.name);if(!data||!Array.isArray(data.gallery)||!Array.isArray(data.news)||typeof data.settings!=='object')throw new Error('資料格式不正確');site=data;saveLocal();render();toast('資料已匯入並存成本機草稿。');}catch(err){toast('匯入失敗：'+err.message,true)}};
$('#reset-bootstrap').onclick=()=>{site=structuredClone(BOOTSTRAP);saveLocal();render();toast('已還原為目前網站內建資料。');};
$('#clear-local').onclick=()=>{if(confirm('確定清除這台裝置的本機草稿？')){draftStore.clear();draftBaseBlob=null;site=structuredClone(BOOTSTRAP);render();window.dispatchEvent(new CustomEvent('tutu:draft',{detail:{saved:true}}));toast('本機草稿已清除。');}};
render();

function renderPublishChecks(){
 const checks=[
  ['LINE 商店網址',/^https:\/\//.test(site.settings?.lineUrl||'')],
  ['品牌故事已填寫',Boolean((site.settings?.storyText||'').trim())],
  ['至少 1 則公開消息',(site.news||[]).some(n=>n.published!==false)],
  ['至少 9 件公開作品',(site.gallery||[]).filter(w=>w.published!==false).length>=9],
  ['作品都有標題',(site.gallery||[]).every(w=>Boolean((w.title||'').trim()))],
  ['沒有重複作品 ID',new Set((site.gallery||[]).map(w=>w.id)).size===(site.gallery||[]).length]
 ];
 const el=document.querySelector('#publish-checks');if(el)el.innerHTML=checks.map(([t,ok])=>`<div class="check-item ${ok?'ok':'warn'}"><b>${ok?'✓':'!'}</b><span>${t}</span></div>`).join('');
}
function previewDraft(){saveLocal();window.open('index.html?draft=1','_blank','noopener');}
document.querySelector('#preview-draft')?.addEventListener('click',previewDraft);
document.querySelector('#preview-publish')?.addEventListener('click',previewDraft);

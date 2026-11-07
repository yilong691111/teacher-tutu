/* Shared data rules for editable public collections. No storage or network access. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TutuContent=api;})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const imagePattern=/^(?:assets\/(?:works\/[\w-]+|[\w-]+)\.(?:webp|jpe?g|png)|data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/=\r\n]+)$/;
 const defaultCharacters=Object.freeze([
  {id:'boy',name:'男塗塗',description:'活潑、好奇，總想第一個探索新鮮事。',image:'assets/tutu-boy.webp',imageAlt:'男塗塗',tone:'ice',published:true},
  {id:'girl',name:'女塗塗',description:'開朗、熱情，喜歡把祝福送給每個人。',image:'assets/tutu-girl.webp',imageAlt:'女塗塗',tone:'pink',published:true},
  {id:'xiaolan',name:'小藍姐姐',description:'藍色雙馬尾、藍色洋裝，帶著笑容加入塗塗的夥伴。',image:'assets/xiaolan-sister.png',imageAlt:'小藍姐姐，藍色雙馬尾與藍色洋裝的蠟筆角色',tone:'ice',published:true},
  {id:'lantian',name:'藍田老師',description:'戴著藍框眼鏡，陪大家上課、點名，一起認真學習。',image:'assets/works/lantian-32044.png',imageAlt:'藍田老師，戴著藍框眼鏡、舉手提醒上課的蠟筆角色',link:'#gallery',linkText:'看看老師的教學日常　↗',gallerySeries:'藍田老師的教學日常',tone:'ice',published:true}
 ].map(Object.freeze));
 const charactersFor=site=>site.characters===undefined?defaultCharacters.map(c=>({...c})):site.characters;
 // Introduce this release's partners once, without replacing an editor's collection.
 // Explicit empty collections and subsequent removals remain intentional edits.
 function syncCharacterAdditions(local,published){
  const revision=published?.characterRevision;
  const releases={'20261105-partners-v1':['yuanyuan','tutu-teacher'],'20261105-teacher-v2':['tutu-teacher'],'20261108-principal-friends-v1':['malan-principal','youyou','nuannuan']};
  if(!local||!releases[revision]||local.characterRevision===revision||!Array.isArray(published.characters))return local;
  const introduced=new Set(releases[revision]);
  if(revision==='20261105-teacher-v2'||revision==='20261108-principal-friends-v1'){
   const images=new Set(published.characters.filter(c=>introduced.has(c.id)).map(c=>c.image));
   const current=local.mediaLibrary||[];
   if(Array.isArray(current)&&Array.isArray(published.mediaLibrary)){
    const entries=published.mediaLibrary.filter(m=>images.has(m.image)&&!current.some(c=>c.image===m.image));
    if(entries.length)local={...local,mediaLibrary:[...current,...structuredClone(entries)]};
   }
  }
  if(local.characters===undefined)return {...local,characters:structuredClone(published.characters),characterRevision:revision};
  if(!Array.isArray(local.characters))return local;
  const ids=new Set(local.characters.map(c=>c.id));
  const additions=local.characters.length?published.characters.filter(c=>introduced.has(c.id)&&!ids.has(c.id)):[];
  return {...local,characters:[...local.characters,...structuredClone(additions)],characterRevision:revision};
 }
 function syncPublishedCharacters(local,published){
  local=syncCharacterAdditions(local,published);
  const revision='20261108-character-profiles-v1';
  if(!local||published?.characterProfilesRevision!==revision||local.characterProfilesRevision===revision||!Array.isArray(local.characters)||!Array.isArray(published.characters))return local;
  const shortened={boy:'活潑、好奇，總想第一個探索新鮮事。',girl:'開朗、熱情，喜歡把祝福送給每個人。',xiaolan:'藍色雙馬尾、藍色洋裝，帶著笑容加入塗塗的夥伴。',lantian:'戴著藍框眼鏡，陪大家上課、點名，一起認真學習。'};
  const current=new Map(published.characters.map(c=>[c.id,c]));
  const characters=local.characters.map(c=>{
   const after=current.get(c.id);
   return shortened[c.id]!==undefined&&c.description===shortened[c.id]&&typeof after?.description==='string'?{...c,description:after.description}:c;
  });
  return {...local,characters,characterProfilesRevision:revision};
 }
 function syncPublishedCatalog(local,published){
  const revision='20261105-line-christmas-v1';
  if(!local||published?.catalogRevision!==revision||local.catalogRevision===revision)return local;
  const productIds=new Set(['37744779','37687563','37681899','37654041','37327487']);
  const workIds=new Set(Array.from({length:24},(_,i)=>'christmas-'+(920161673+i)));
  const merge=(key,introduced,prepend=false)=>{
   const current=local[key],source=published[key];if(!Array.isArray(source))return current;
   if(current===undefined)return structuredClone(source);if(!Array.isArray(current)||!current.length)return current;
   const ids=new Set(current.map(item=>item.id)),added=structuredClone(source.filter(item=>introduced(item)&&!ids.has(item.id)));
   return prepend?[...added,...current]:[...current,...added];
  };
  let lineProducts=merge('lineProducts',p=>productIds.has(p.id),true);
  const christmas=published.lineProducts?.find(p=>p.id==='37513322');
  if(christmas&&Array.isArray(lineProducts))lineProducts=lineProducts.map(p=>{
   if(p.id!==christmas.id)return p;
   const next={...p};for(const [key,before] of Object.entries({category:'其他節慶',description:'',checkedDate:'2026-10-29'}))if(p[key]===before&&christmas[key]!==undefined)next[key]=christmas[key];
   if(p.image==='assets/line-product-37513322.png'){next.image=christmas.image;if(christmas.sourceImageUrl)next.sourceImageUrl=christmas.sourceImageUrl;}return next;
  });
  const gallery=merge('gallery',w=>workIds.has(w.id)),available=new Set((gallery||[]).map(w=>w.id));
  let festivals=merge('festivals',f=>f.id==='line-product-37513322'&&lineProducts?.some(p=>p.id==='37513322'));
  if(Array.isArray(festivals))festivals=festivals.map(f=>{
   if(f.id!=='line-product-37513322'||local.festivals?.some(x=>x.id===f.id))return f;
   const next={...f};if(lineProducts?.find(p=>p.id==='37513322')?.published===false)next.published=false;
   if(next.coverWorkId&&!available.has(next.coverWorkId))next.coverWorkId='';
   if(Array.isArray(next.workIds))next.workIds=next.workIds.filter(id=>available.has(id));return next;
  });
  return {...local,lineProducts,gallery,festivals,catalogRevision:revision};
 }
 const safeImage=value=>typeof value==='string'&&imagePattern.test(value);
 function safeLink(value){
  if(typeof value!=='string'||!value||value.length>2000||/\s/.test(value))return false;
  if(['#top','#about','#characters','#gallery','#news','#series','#line','#line-catalog','#contact'].includes(value))return true;
  try{const u=new URL(value);return u.protocol==='https:'&&!!u.hostname&&!u.username&&!u.password;}catch{return false;}
 }
 function productFromUrl(value){
  try{
   const u=new URL(String(value).trim());if(u.protocol!=='https:'||u.username||u.password)throw 0;
   const match=u.hostname==='store.line.me'?u.pathname.match(/^\/stickershop\/product\/(\d{1,20})\/zh-Hant\/?$/):u.hostname==='line.me'?u.pathname.match(/^\/S\/sticker\/(\d{1,20})\/?$/):null;
   if(!match)throw 0;const id=match[1];return {id,url:`https://store.line.me/stickershop/product/${id}/zh-Hant`};
  }catch{throw new Error('請填寫正確的 LINE 貼圖商品網址。');}
 }
 function text(item,key,label,max,required=false){const v=item[key];if(v===undefined&&!required)return;if(typeof v!=='string'||v.length>max||(required&&!v.trim()))throw new Error(label+'格式不正確或字數超過限制。');}
 function common(item,label){
  if(!item||typeof item.id!=='string'||!/^[\w-]{1,100}$/.test(item.id))throw new Error(label+'識別碼不正確。');
  if(!safeImage(item.image))throw new Error(label+'圖片必須是網站內圖片或上傳的圖片。');
  if(item.published!==undefined&&typeof item.published!=='boolean')throw new Error(label+'展示狀態不正確。');
 }
 function validateProduct(p){
  common(p,'LINE 貼圖');const canonical=productFromUrl(p.url);
  if(canonical.id!==p.id||canonical.url!==p.url)throw new Error('LINE 貼圖識別碼與商品連結不一致。');
  text(p,'title','LINE 貼圖名稱',150,true);text(p,'author','LINE 貼圖作者',100);text(p,'category','LINE 貼圖分類',100);text(p,'description','LINE 貼圖介紹',3000);
 }
 function validateCharacter(c){
  common(c,'角色');text(c,'name','角色名稱',80,true);text(c,'description','角色介紹',1500);text(c,'imageAlt','角色圖片說明',200);text(c,'gallerySeries','角色作品系列',100);text(c,'link','角色連結',2000);text(c,'linkText','角色按鈕文字',80);
  if(c.link&&!safeLink(c.link))throw new Error('角色連結必須是官網區塊或 HTTPS 網址。');
  if(Boolean(c.link)!==Boolean(c.linkText?.trim()))throw new Error('角色按鈕文字與連結請一起填寫，或一起留空。');
 }
 function validateCollections(site){
  for(const [key,label,validate] of [['lineProducts','LINE 貼圖',validateProduct],['characters','角色',validateCharacter]]){
   const list=site[key];if(list===undefined)continue;if(!Array.isArray(list))throw new Error(label+'資料必須是清單。');
   const ids=new Set();for(const item of list){validate(item);if(ids.has(item.id))throw new Error(label+'識別碼重複。');ids.add(item.id);}
  }
  return site;
 }
 function upsert(list,originalId,item,validate,label){
  const index=originalId?list.findIndex(x=>x.id===originalId):-1;
  if(originalId&&index<0)throw new Error(label+'已不存在，請重新開啟編輯。');
  if(list.some((x,i)=>x.id===item.id&&i!==index))throw new Error(label+'識別碼重複，請編輯既有項目。');
  const merged={...(index>=0?list[index]:{}),...item};validate(merged);
  const result=list.slice();if(index>=0)result[index]=merged;else result.unshift(merged);return result;
 }
 function saveProduct(list,originalId,fields){
  const canonical=productFromUrl(fields.url);if(fields.id!==undefined&&fields.id!==canonical.id)throw new Error('LINE 貼圖識別碼與連結不一致。');
  const next=upsert(list,originalId,{...fields,...canonical},validateProduct,'LINE 貼圖');
  if(originalId&&originalId!==canonical.id){const p=next.find(x=>x.id===canonical.id);delete p.checkedDate;delete p.sourceImageUrl;delete p.sourceAuthorUrl;}
  return next;
 }
 function saveCharacter(list,originalId,fields){
  if(originalId&&fields.id!==originalId)throw new Error('角色識別碼不可在編輯時更換。');
  return upsert(list,originalId,fields,validateCharacter,'角色');
 }
 function moveItem(list,id,direction){
  if(![1,-1,'top','bottom'].includes(direction))throw new Error('排序方向不正確。');
  const result=list.slice(),index=result.findIndex(x=>x.id===id),target=direction==='top'?0:direction==='bottom'?result.length-1:index+direction;
  if(index>=0&&target>=0&&target<result.length)result.splice(target,0,result.splice(index,1)[0]);return result;
 }
 return {defaultCharacters,charactersFor,syncPublishedCharacters,syncPublishedCatalog,safeImage,safeLink,productFromUrl,saveProduct,saveCharacter,moveItem,validateCollections};
});

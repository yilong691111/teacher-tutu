/* Shared draft preview URLs and a review of effective public content. */
(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(...(node?[require('./content-models.js'),require('./festival-model.js'),require('./report-model.js'),require('./homepage-text.js'),require('./homepage-rich-text.js')]:[root.TutuContent,root.TutuFestivals,root.TutuReports,root.TutuHomepageText,root.TutuHomepageRich]));if(node)module.exports=api;else root.TutuPublishReview=api;})(typeof window==='undefined'?globalThis:window,function(content,festivals,reports,home,rich){
 'use strict';
 const labels={catalogTags:'篩選標籤',topic:'主題',characters:'角色',holidays:'節日',situations:'使用情境',title:'標題',name:'名稱',description:'介紹',body:'內文',image:'圖片',imageAlt:'圖片說明',alt:'圖片說明',url:'連結網址',link:'連結網址',buttonLink:'按鈕連結網址',buttonText:'按鈕文字',published:'展示狀態',featured:'精選',category:'分類',date:'日期',eventDate:'節慶日期',holidayName:'節日名稱',subtitle:'副標題',tags:'標籤',workIds:'搭配作品',coverWorkId:'封面來源',sections:'內文卡片',images:'搭配圖片',showImages:'顯示圖片',label:'標籤',text:'文字',fontSize:'字體大小',effect:'文字特效',underline:'底線特效',background:'背景顏色',linkText:'超連結文字',brand:'品牌中文名稱',brandEn:'品牌英文名稱',lineUrl:'LINE 貼圖商店網址',instagram:'Instagram 網址',homepageTagline:'品牌短句'};
 const effects={none:'無',bold:'粗體',shadow:'陰影',outline:'描邊',glow:'光暈',solid:'單底線',double:'雙底線',wavy:'波浪底線',highlight:'螢光標示',transparent:'透明'};
 const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
 const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
 function previewUrl(anchor=''){
  if(typeof anchor!=='string'||!/^[\w-]{0,100}$/.test(anchor))throw new Error('預覽區塊不正確。');
  return 'index.html?draft=1&v=20261103-preview-assets-tags'+(anchor?'#'+anchor:'');
 }
 function settingValues(settings={}){
  const result={...settings},tagline=settings.homepageTagline??'每一筆都值得被珍藏';delete result.tagline;result.homepageTagline=tagline;
  for(const slide of [1,2,3]){
   const values=home.values(settings,slide),prefix=slide===1?'hero':'hero'+slide;
   // Normalize legacy text and its structured equivalent into one visible value.
   for(const key of Object.keys(home.defaults)){
    const stored=slide===1&&key==='heroTitle'?'heroIntroTitle':slide===1&&key==='heroImage'?'heroIntroImage':key.replace(/^hero/,prefix);
    delete result[stored];if(key==='heroDescription'||key==='heroDescriptionSize')continue;
    result['首頁介紹 '+slide+'／'+({heroImage:'圖片',heroKicker:'英文短句',heroTitle:'標題',heroHighlight:'強調文字',heroKickerColor:'短句顏色',heroKickerSize:'短句大小',heroTitleColor:'標題顏色',heroTitleSize:'標題大小',heroHighlightColor:'強調顏色',heroDescriptionColor:'內文顏色'}[key]||key)]=values[key];
   }
   delete result[rich.key(slide)];result['首頁介紹 '+slide+'／內文']=rich.blocksFor(settings,slide,values.heroDescription,values.heroDescriptionSize);
  }
  return result;
 }
 function fieldsFor(before,after,prefix=''){
  const result=[];
  const walk=(a,b,label,key)=>{
   if(equal(a,b))return;
   if(key==='published'){result.push({label,before:a!==false?'展示':'隱藏',after:b!==false?'展示':'隱藏',type:'text'});return;}
   const image=/(?:^image$|Image$|／圖片$)/.test(key);
   if(image){result.push({label,before:a,after:b,type:'image'});return;}
   if((a&&typeof a==='object')||(b&&typeof b==='object')){
    const array=Array.isArray(a)||Array.isArray(b);
    if(array&&[...(a||[]),...(b||[])].every(x=>x===null||typeof x!=='object')){result.push({label,before:a,after:b,type:'text'});return;}
    for(const k of new Set([...Object.keys(a||{}),...Object.keys(b||{})]))walk(a?.[k],b?.[k],label+'／'+(array?'第 '+(Number(k)+1)+' 項':labels[k]||k),k);
    return;
   }
   result.push({label,before:a,after:b,type:'text',key});
  };
  for(const key of new Set([...Object.keys(before||{}),...Object.keys(after||{})])){
   if(key==='id'||key==='published'&&(before?.published!==false)===(after?.published!==false))continue;
   walk(before?.[key],after?.[key],prefix+(labels[key]||key),key);
  }
  return result;
 }
 function compare(before={},after={}){
  const result=[];
  const collections=[['news','最新消息',s=>s.news||[]],['reports','特別報導',s=>reports.reportsFor(s)],['festivals','節慶系列',s=>festivals.festivalsFor(s)],['characters','人物夥伴',s=>content.charactersFor(s)],['lineProducts','LINE 貼圖',s=>s.lineProducts||[]],['gallery','作品相簿',s=>s.gallery||[]],['mediaLibrary','圖片素材庫',s=>s.mediaLibrary||[]]];
  const settings=fieldsFor(settingValues(before.settings),settingValues(after.settings));if(settings.length)result.push({area:'首頁與網站設定',title:'首頁與網站設定',actions:['修改'],fields:settings,linked:false});
  for(const [key,area,get] of collections){
   const old=get(before),next=get(after),identity=x=>key==='mediaLibrary'?x.image:x.id,oldMap=new Map(old.map(x=>[identity(x),x])),nextMap=new Map(next.map(x=>[identity(x),x]));
   for(const id of new Set([...oldMap.keys(),...nextMap.keys()])){
    const a=oldMap.get(id),b=nextMap.get(id),actions=[],fields=fieldsFor(a,b);
    if(!a)actions.push('新增');else if(!b)actions.push('刪除');else{
     if(fields.some(f=>f.label!=='展示狀態'))actions.push('修改');
     if((a.published!==false)!==(b.published!==false))actions.push(b.published===false?'隱藏':'展示');
    }
    if(actions.length)result.push({area,id:key==='mediaLibrary'?'素材':id,title:(b||a).title||(b||a).name||'未命名項目',actions,fields,linked:key==='festivals'&&/^line-product-\d{1,20}$/.test(id)});
   }
   const oldOrder=old.map(identity).filter(id=>nextMap.has(id)),newOrder=next.map(identity).filter(id=>oldMap.has(id));
   if(!equal(oldOrder,newOrder))result.push({area,title:'清單順序',actions:['排序'],fields:[{label:'順序',before:old.filter(x=>nextMap.has(identity(x))).map(x=>x.title||x.name||'未命名項目'),after:next.filter(x=>oldMap.has(identity(x))).map(x=>x.title||x.name||'未命名項目'),type:'text'}],linked:false});
  }
  const categoryFields=fieldsFor(before.categoryLists,after.categoryLists);if(categoryFields.length)result.push({area:'分類',title:'分類名稱與順序',actions:['修改'],fields:categoryFields,linked:false});
  return result;
 }
 function textValue(value,key){
  if(value===undefined||value===null||value==='')return '（空白）';if(typeof value==='boolean')return value?'是':'否';
  if(Array.isArray(value))return value.map(x=>textValue(x)).join(' → ');
  if(typeof value==='string'&&value.startsWith('data:'))return '（內嵌圖片資料）';
  return key&&['effect','underline','background'].includes(key)&&effects[value]?effects[value]:String(value);
 }
 function render(doc,container,changes){
  if(!container)return;container.replaceChildren();
  const make=(tag,text,className)=>{const el=doc.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
  if(!changes.length){container.append(make('p','目前沒有內容變更。','muted'));return;}
  const totals=new Map();for(const change of changes)for(const action of change.actions)totals.set(action,(totals.get(action)||0)+1);
  container.append(make('p','共 '+changes.length+' 筆變更：'+[...totals].map(([a,n])=>a+' '+n+' 筆').join('、')+'。點開項目核對前後內容。','review-total'));
  for(const change of changes){
   const card=make('details',undefined,'review-change'),summary=make('summary',change.actions.join('、')+'｜'+change.area+'｜'+change.title+(change.linked?'（貼圖連動）':''));card.append(summary);
   for(const field of change.fields){
    const row=make('div',undefined,'review-field');row.append(make('strong',field.label));
    for(const [key,label] of [['before','官網目前'],['after','本次草稿']]){
     const value=field[key],box=make('div',undefined,'review-value');box.append(make('small',label));
     if(field.type==='image'&&content.safeImage(value)){const img=make('img');img.src=value;img.alt=label+'圖片';img.loading='lazy';box.append(img);}
     else box.append(make('p',field.type==='image'?'（無圖片）':textValue(value,field.key)));
     row.append(box);
    }card.append(row);
   }container.append(card);
  }
 }
 return {previewUrl,compare,render};
});

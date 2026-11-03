/* Three independently editable hero slides; plain text only. */
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('./content-models.js'):root.TutuContent);if(typeof module==='object'&&module.exports)module.exports=api;else{
  root.TutuHomepageText=api;
  for(const suffix of ['', '-2', '-3'])root.document.getElementById('homepage-editor'+suffix)?.addEventListener('input',()=>api.preview(root.document));
 }
})(typeof window==='undefined'?globalThis:window,function(content){
 'use strict';
 const defaults=Object.freeze({heroKicker:"✦ WELCOME TO TUTU'S WORLD",heroKickerColor:'#1149bd',heroKickerSize:12,heroTitle:'把孩子的想像力\n畫進每一天。',heroHighlight:'想像力',heroTitleColor:'#192849',heroTitleSize:63,heroHighlightColor:'#f15252',heroDescriptionColor:'#536582',heroDescriptionSize:16,heroDescription:'',heroImage:'assets/tutu-hero.webp'});
 const sizes={heroKickerSize:[10,28],heroTitleSize:[24,84],heroDescriptionSize:[12,28]};
 const slides=[defaults,{...defaults,heroImage:'assets/tutu-original.webp',heroKicker:'✦ ORIGINAL CRAYON ART',heroTitle:'歪歪的線條，\n獨一無二的塗塗。',heroHighlight:'獨一無二',heroDescription:'藍色蠟筆外框、圓圓的笑臉與大膽的顏色，是塗塗最有辨識度的原創表情。'},{...defaults,heroImage:'assets/works/002.webp',heroKicker:'✦ CELEBRATE EVERY LITTLE DAY',heroTitle:'塗塗的日常，\n一起說祝福。',heroHighlight:'一起說祝福。',heroDescription:'從日常問候到羊年賀歲，每張貼圖都保留孩子畫作的童真筆觸。'}];
 const fieldKey=(key,slide)=>slide===1?key:key.replace(/^hero/,'hero'+slide);
 const storedKey=(key,slide)=>slide===1&&key==='heroTitle'?'heroIntroTitle':slide===1&&key==='heroImage'?'heroIntroImage':fieldKey(key,slide);
 function validate(settings){
  for(const slide of [1,2,3]){
   const image=settings[storedKey('heroImage',slide)];if(image!==undefined&&!content.safeImage(image))throw new Error('首頁介紹 '+slide+' 圖片格式不正確。');
   for(const [key,max] of [['heroKicker',100],['heroTitle',160],['heroHighlight',40],['heroDescription',1000]]){
    const value=settings[storedKey(key,slide)];if(value!==undefined&&(typeof value!=='string'||value.length>max||(key==='heroTitle'&&!value.trim())))throw new Error('首頁介紹 '+slide+' 文字格式不正確或超過字數限制。');
   }
   for(const key of ['heroKickerColor','heroTitleColor','heroHighlightColor','heroDescriptionColor']){
    const value=settings[storedKey(key,slide)];if(value!==undefined&&(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value)))throw new Error('首頁介紹 '+slide+' 字體顏色請使用六位數色碼。');
   }
   for(const [key,[min,max]] of Object.entries(sizes)){
    const value=settings[storedKey(key,slide)];if(value!==undefined&&(!Number.isInteger(value)||value<min||value>max))throw new Error(`首頁介紹 ${slide} 字體大小請填入 ${min}–${max} 的整數。`);
   }
  }
 }
 function values(settings={},slide=1){
  const result={...(slides[slide-1]||defaults)};
  for(const key of Object.keys(defaults)){const stored=storedKey(key,slide);if(settings[stored]!==undefined){try{validate({[stored]:settings[stored]});result[key]=settings[stored];}catch{}}}
  return result;
 }
 function render(doc,settings,nodes,slide=1){
  const s=values(settings,slide),{title,kicker,description,image}=nodes;
  if(image){image.src=s.heroImage;image.hidden=false;if(s.heroImage!==slides[slide-1].heroImage)image.alt='首頁介紹 '+slide+' 搭配圖片';}
  if(kicker){kicker.textContent=s.heroKicker;kicker.hidden=!s.heroKicker.trim();kicker.style.color=s.heroKickerColor;kicker.style.fontSize=s.heroKickerSize+'px';}
  if(title){
   title.replaceChildren();const index=s.heroHighlight?s.heroTitle.indexOf(s.heroHighlight):-1;
   if(index<0)title.textContent=s.heroTitle;else{
    const span=doc.createElement('span');span.textContent=s.heroHighlight;span.style.color=s.heroHighlightColor;
    title.append(doc.createTextNode(s.heroTitle.slice(0,index)),span,doc.createTextNode(s.heroTitle.slice(index+s.heroHighlight.length)));
   }
   title.style.color=s.heroTitleColor;title.style.setProperty('--homepage-title-size',s.heroTitleSize+'px');
  }
  if(description){description.textContent=s.heroDescription;description.style.color=s.heroDescriptionColor;description.style.setProperty('--homepage-description-size',s.heroDescriptionSize+'px');}
 }
 function read(doc){
  const result={};for(const slide of [1,2,3])for(const key of ['heroDescription','heroImage']){
   const field=doc.getElementById('settings-'+fieldKey(key,slide));if(field)result[storedKey(key,slide)]=field.value.trim();
  }return result;
 }
 function preview(doc){
  const settings=read(doc);
  for(const slide of [1,2,3]){const suffix=slide===1?'':'-'+slide;if(!doc.getElementById('homepage-editor'+suffix))continue;
   render(doc,settings,{description:doc.getElementById('homepage-preview-description'+suffix),image:doc.getElementById('homepage-'+slide+'-image-preview')},slide);
  }
 }
 function fill(doc,settings,assets=[]){
  for(const slide of [1,2,3]){
   const s=values(settings,slide);for(const key of ['heroDescription','heroImage']){const field=doc.getElementById('settings-'+fieldKey(key,slide));if(field)field.value=s[key];}
   const select=doc.getElementById('homepage-'+slide+'-media');if(select){
    const option=(name,value)=>{const el=doc.createElement('option');el.textContent=name;el.value=value;return el;};
    select.replaceChildren(option('選擇素材（保留目前圖片）',''),...assets.map(asset=>option(asset.name,asset.image)));
   }
  }preview(doc);
 }
 return {defaults,validate,values,render,read,fill,preview};
});

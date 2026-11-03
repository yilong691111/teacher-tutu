/* Editable first-slide copy and typography; plain text only. */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{
  root.TutuHomepageText=api;
  root.document.getElementById('homepage-editor')?.addEventListener('input',()=>api.preview(root.document));
 }
})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const defaults=Object.freeze({heroKicker:"✦ WELCOME TO TUTU'S WORLD",heroKickerColor:'#1149bd',heroKickerSize:12,heroTitle:'把孩子的想像力\n畫進每一天。',heroHighlight:'想像力',heroTitleColor:'#192849',heroTitleSize:63,heroHighlightColor:'#f15252',heroDescriptionColor:'#536582',heroDescriptionSize:16});
 const sizes={heroKickerSize:[10,28],heroTitleSize:[24,84],heroDescriptionSize:[12,28]};
 function validate(settings){
  for(const [key,max] of [['heroKicker',100],['heroTitle',160],['heroHighlight',40],['heroDescription',1000]]){
   const value=settings[key];if(value!==undefined&&(typeof value!=='string'||value.length>max||(key==='heroTitle'&&!value.trim())))throw new Error('首頁文字格式不正確或超過字數限制。');
  }
  for(const key of ['heroKickerColor','heroTitleColor','heroHighlightColor','heroDescriptionColor'])if(settings[key]!==undefined&&(typeof settings[key]!=='string'||!/^#[0-9a-f]{6}$/i.test(settings[key])))throw new Error('首頁字體顏色請使用六位數色碼。');
  for(const [key,[min,max]] of Object.entries(sizes))if(settings[key]!==undefined&&(!Number.isInteger(settings[key])||settings[key]<min||settings[key]>max))throw new Error(`首頁字體大小請填入 ${min}–${max} 的整數。`);
 }
 function values(settings={}){
  const result={...defaults};for(const key of Object.keys(defaults))if(settings[key]!==undefined){try{validate({[key]:settings[key]});result[key]=settings[key];}catch{}}
  return {...result,heroDescription:typeof settings.heroDescription==='string'?settings.heroDescription:''};
 }
 function render(doc,settings,nodes){
  const s=values(settings),{title,kicker,description}=nodes;
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
  const result={};for(const key of Object.keys(defaults)){const value=doc.getElementById('settings-'+key).value;result[key]=Object.hasOwn(sizes,key)?Number(value):value.trim();}
  return result;
 }
 function preview(doc){
  if(!doc.getElementById('homepage-editor'))return;
  const settings={...read(doc),heroDescription:doc.getElementById('settings-heroDescription').value};
  render(doc,settings,{title:doc.getElementById('homepage-preview-title'),kicker:doc.getElementById('homepage-preview-kicker'),description:doc.getElementById('homepage-preview-description')});
 }
 function fill(doc,settings){const s=values(settings);for(const key of Object.keys(defaults))doc.getElementById('settings-'+key).value=s[key];preview(doc);}
 return {defaults,validate,values,render,read,fill,preview};
});

/* Structured homepage paragraphs. Text is never interpreted as HTML. */
(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(node?require('./content-models.js'):root.TutuContent);if(node)module.exports=api;else root.TutuHomepageRich=api;})(typeof window==='undefined'?globalThis:window,function(content){
 'use strict';
 const effects=['none','bold','shadow','outline','glow'],underlines=['none','solid','double','wavy','highlight'];
 const key=slide=>(slide===1?'hero':'hero'+slide)+'TextBlocks';
 const block=(text='',fontSize=16)=>({text,fontSize,effect:'none',underline:'none',background:'transparent',linkText:'',url:''});
 const color=value=>value==='transparent'||typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
 function validateBlocks(list){
  if(!Array.isArray(list)||list.length>20)throw new Error('首頁每張介紹最多可放 20 段內文。');
  for(const b of list){
   if(!b||typeof b.text!=='string'||b.text.length>1000)throw new Error('首頁每段內文最多 1000 字。');
   if(!Number.isInteger(b.fontSize)||b.fontSize<12||b.fontSize>40)throw new Error('首頁內文字體大小請填入 12–40 的整數。');
   if(!effects.includes(b.effect)||!underlines.includes(b.underline)||!color(b.background))throw new Error('首頁文字特效、底線或背景顏色格式不正確。');
   if(typeof b.linkText!=='string'||b.linkText.length>100||typeof b.url!=='string'||b.url.length>2000||Boolean(b.linkText.trim())!==Boolean(b.url.trim())||(b.url&&!content.safeLink(b.url)))throw new Error('首頁超連結請同時填寫文字和有效的 HTTPS 網址或官網區塊連結。');
  }
 }
 function validate(settings){
  for(const slide of [1,2,3])if(settings[key(slide)]!==undefined)validateBlocks(settings[key(slide)]);
  if(settings.homepageTagline!==undefined&&(typeof settings.homepageTagline!=='string'||settings.homepageTagline.length>150))throw new Error('首頁品牌短句最多 150 字。');
 }
 function blocksFor(settings,slide,fallback='',fontSize=16){const list=settings[key(slide)];return Array.isArray(list)?list.map(b=>({...b})):[block(fallback,fontSize)];}
 function render(doc,container,list){
  if(!container)return;container.replaceChildren();
  for(const raw of list.slice(0,20)){
   const b={...block(),...raw};if(!b.text&&!b.linkText)continue;
   const el=doc.createElement('div');el.className='homepage-text-block';
   el.style.setProperty('--copy-font-size',(Number.isInteger(b.fontSize)&&b.fontSize>=12&&b.fontSize<=40?b.fontSize:16)+'px');
   el.classList.add('copy-effect-'+(effects.includes(b.effect)?b.effect:'none'));
   if(color(b.background)&&b.background!=='transparent'){el.style.backgroundColor=b.background;el.classList.add('copy-background');}
   if(b.text){const text=doc.createElement('span');text.className='homepage-text-content copy-underline-'+(underlines.includes(b.underline)?b.underline:'none');text.textContent=b.text;el.append(text);}
   if(b.linkText&&content.safeLink(b.url)){const link=doc.createElement('a');link.className='homepage-copy-link';link.textContent=b.linkText;link.href=b.url;if(b.url.startsWith('https:')){link.target='_blank';link.rel='noopener noreferrer';}el.append(link);}
   container.append(el);
  }
 }
 return {effects,underlines,key,block,validate,validateBlocks,blocksFor,render};
});

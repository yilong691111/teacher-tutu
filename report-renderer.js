/* Public reports: text-only rendering and independent, canonical article sharing. */
(function(root,factory){const model=typeof module==='object'&&module.exports?require('./report-model.js'):root.TutuReports;const api=factory(model,root);if(typeof module==='object'&&module.exports)module.exports=api;else root.TutuReportRenderer=api;})(typeof window==='undefined'?globalThis:window,function(model,root){
 'use strict';
 function mount(site,options={}){
  const doc=options.document||document,sharing=options.sharing||root.TutuArticleSharing,list=doc.getElementById('report-list');if(!list)return;
  const node=(tag,cls,text)=>{const el=doc.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
  const records=model.reportsFor(site),visible=(Array.isArray(records)?records:[]).filter(r=>r&&r.published!==false&&typeof r.title==='string');
  const cards=visible.map(r=>{
   const anchor=model.anchor(r),card=node('article','report-article');card.id=anchor;card.setAttribute('aria-label',r.title);
   const toolbar=node('div','report-share-controls');toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','分享文章：'+r.title);
   const share=node('button','button outline','分享文章 ↗'),copy=node('button','text-button','複製連結');share.type=copy.type='button';toolbar.append(share,copy);
   const status=node('p','report-share-status','');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
   const fallback=node('div','report-share-fallback');fallback.hidden=true;const label=node('label',null,'文章連結');label.htmlFor=anchor+'-share-url';const input=node('input');input.id=label.htmlFor;input.type='text';input.readOnly=true;input.setAttribute('aria-label',r.title+'文章連結');fallback.append(label,input,node('p',null,'請選取並複製連結，即可貼到聊天或社群中分享。'));
   const body=node('div','idiom-promo'),head=node('div','idiom-promo-heading');
   if(r.label)head.append(node('span','idiom-label',r.label));if(r.subtitle)head.append(node('h3',null,r.subtitle));
   head.append(node(r.subtitle?'p':'h3','idiom-headline',r.title));if(r.summary)head.append(node('p','idiom-lead',r.summary));head.append(node('p','report-body',r.body||''));body.append(head);
   if(Array.isArray(r.sections)&&r.sections.length){const sections=node('div','idiom-audiences');if(r.id==='grade7-idioms')sections.id='idiom-readers';for(const section of r.sections){const box=node('article');if(section.label)box.append(node('span','idiom-audience-label',section.label));box.append(node('h4',null,section.title),node('p',null,section.body));sections.append(box);}body.append(sections);}
   if(r.closing||(r.buttonText&&model.safeLink(r.buttonLink))){const actions=node('div','idiom-promo-action');if(r.closing)actions.append(node('p',null,r.closing));if(r.buttonText&&model.safeLink(r.buttonLink)){let button;if(r.id==='grade7-idioms'&&r.buttonLink==='?topic=idioms#line-catalog'){button=node('button','button blue',r.buttonText);button.id='show-grade7-idioms';button.type='button';}else{button=node('a','button blue',r.buttonText);button.href=r.buttonLink;if(r.buttonLink.startsWith('https://')){button.target='_blank';button.rel='noopener noreferrer';}}actions.append(button);}body.append(actions);}
   card.append(toolbar,status,fallback,body);
   sharing?.mount({title:r.title+'｜'+(site.settings?.brand||'塗塗老師'),text:r.summary||'',url:'https://yilong691111.github.io/teacher-tutu/#'+anchor},{document:doc,elements:{share,copy,status,fallback,input}});
   return card;
  });
  if(!cards.length)cards.push(node('p','reports-empty','目前沒有公開的特別報導，敬請期待。'));list.replaceChildren(...cards);
 }
 return {mount};
});

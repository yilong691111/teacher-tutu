/* Public sticker catalog: topic -> fine category -> search. No content writes. */
(function(root,factory){const node=typeof module==='object'&&module.exports;const api=factory(node?require('./catalog-navigation.js'):root.TutuCatalogNavigation);if(node)module.exports=api;else root.TutuCatalogBrowser=api;})(typeof window==='undefined'?globalThis:window,function(model){
 'use strict';
 function mount(site,options={}){
  const doc=options.document||document,win=options.window||window,$=id=>doc.getElementById(id),safeImage=options.safeImage||(x=>x),items=model.products(site),topics=model.topicOptions(items);
  let limit=9;let state={topic:'all',category:'',query:''};const validTopic=value=>topics.some(x=>x.id===value)?value:'all';state.topic=validTopic(new URL(win.location.href).searchParams.get('topic'));
  function topicUrl(topic){const url=new URL(win.location.href);url.searchParams.delete('work');if(topic==='all')url.searchParams.delete('topic');else url.searchParams.set('topic',topic);url.hash='line-catalog';return url.toString();}
  function productCard(p,compact=false){
   const card=doc.createElement('article');card.className='line-product-card';const link=doc.createElement('a');link.href=p.url;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',`前往《${p.title}》LINE 商品頁`);
   const cover=doc.createElement('div');cover.className='line-product-image';const img=doc.createElement('img');img.src=safeImage(p.image);img.alt=p.title+' 貼圖封面';img.loading='lazy';img.width=240;img.height=240;cover.append(img);
   const body=doc.createElement('div');body.className='line-product-body';const tag=doc.createElement('span');tag.className='line-product-category';tag.textContent=model.categoryOf(p);const title=doc.createElement('h3');title.textContent=p.title;const author=doc.createElement('p');author.textContent=p.author?`作者：${p.author}`:'';body.append(tag,title);if(!compact)body.append(author);
   if(p.description&&!compact){const description=doc.createElement('p');description.className='line-product-description';description.textContent=p.description;body.append(description);}const action=doc.createElement('span');action.className='line-product-action';action.textContent='前往 LINE STORE ↗';body.append(action);link.append(cover,body);card.append(link);return card;
  }
  function render(){
   const focusedTopic=doc.activeElement?.dataset?.topic;
   $('line-catalog').hidden=false;$('line-product-count').textContent=String(items.length);
   $('line-product-filters').replaceChildren(...topics.map(t=>{const b=doc.createElement('button');b.type='button';b.dataset.topic=t.id;b.textContent=`${t.label}（${t.count}）`;b.classList.toggle('on',t.id===state.topic);b.setAttribute('aria-pressed',String(t.id===state.topic));b.addEventListener('click',()=>setTopic(t.id));return b;}));
   if(focusedTopic)Array.from($('line-product-filters').children).find(b=>b.dataset.topic===focusedTopic)?.focus();
   const cats=model.categoryOptions(site,items,state.topic);if(!cats.includes(state.category))state.category='';const option=(text,value)=>{const el=doc.createElement('option');el.textContent=text;el.value=value;return el;};$('line-category-filter').replaceChildren(option('全部細分類',''),...cats.map(c=>option(c,c)));$('line-category-filter').value=state.category;$('line-category-filter').disabled=!cats.length;
   $('line-product-search').value=state.query;const visible=model.filterProducts(items,state),shown=visible.slice(0,limit);$('line-product-grid').replaceChildren(...shown.map(p=>productCard(p)));$('line-product-result').textContent=`${topics.find(t=>t.id===state.topic).label} · 顯示 ${shown.length}／${visible.length} 款符合條件的貼圖（全部共 ${items.length} 款）`;$('load-more-line-products').hidden=shown.length>=visible.length;$('load-more-line-products').textContent=`載入更多貼圖（還有 ${Math.max(0,visible.length-shown.length)} 款） ↓`;
   $('line-product-empty').hidden=visible.length>0;$('line-product-empty').textContent=items.length?'找不到符合條件的貼圖，請清除篩選或試試其他關鍵字。':'貼圖作品準備中，歡迎稍後再來看看。';$('clear-line-products').disabled=state.topic==='all'&&!state.category&&!state.query;
  }
  function setTopic(value,{scroll=false,url=true}={}){limit=9;state={topic:validTopic(value),category:'',query:''};render();if(url){win.history.replaceState(null,'',topicUrl(state.topic));options.onNavigate?.();}if(scroll){const heading=$('line-catalog-title');heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});$('line-catalog').scrollIntoView({behavior:win.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}}
  $('line-product-search').addEventListener('input',e=>{limit=9;state.query=e?.target?.value??$('line-product-search').value;render();});$('line-category-filter').addEventListener('change',e=>{limit=9;state.category=e?.target?.value??$('line-category-filter').value;render();});$('clear-line-products').onclick=()=>setTopic('all');
  for(const link of doc.querySelectorAll('[data-catalog-topic]')){const topic=validTopic(link.dataset.catalogTopic);link.hidden=link.dataset.catalogTopic!=='all'&&!topics.some(t=>t.id===link.dataset.catalogTopic);link.href=topicUrl(topic);link.addEventListener('click',event=>{if(event.button>0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();setTopic(topic,{scroll:true});});}
  if($('show-grade7-idioms'))$('show-grade7-idioms').onclick=()=>setTopic('idioms',{scroll:true});
  win.addEventListener('popstate',()=>setTopic(new URL(win.location.href).searchParams.get('topic'),{url:false}));
  $('featured-stickers').hidden=items.length===0;$('featured-sticker-grid').replaceChildren(...items.slice(0,6).map(p=>productCard(p,true)));
  $('load-more-line-products').onclick=()=>{const previous=$('line-product-grid').children.length;limit+=9;render();$('line-product-grid').children[previous]?.children[0]?.focus({preventScroll:true});};
  render();return {setTopic,reset:()=>setTopic('all'),render,get state(){return {...state};}};
 }
 return {mount};
});

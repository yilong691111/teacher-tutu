/* Repeated paragraph controls keep one JSON field per slide for draft recovery. */
(function(){
 'use strict';
 const rich=window.TutuHomepageRich;if(!rich||!document.getElementById('settings-form'))return;
 const editors=new Map();
 function paintLocks(){const locked=document.querySelector('.content').getAttribute('aria-busy')==='true'||document.getElementById('dashboard').inert;document.querySelectorAll('.homepage-blocks input,.homepage-blocks textarea,.homepage-blocks select,.homepage-blocks button').forEach(el=>el.disabled=locked||el.dataset.orderBoundary==='true');document.querySelectorAll('[id$="-add-block"]').forEach(el=>el.disabled=locked||el.dataset.limitReached==='true');}
 const names={effect:{none:'無',bold:'粗體',shadow:'陰影',outline:'描邊',glow:'柔光'},underline:{none:'無',solid:'一般底線',double:'雙底線',wavy:'波浪底線',highlight:'螢光筆底線'}};
 for(const slide of [1,2,3]){
  const prefix=slide===1?'hero':'hero'+slide,hidden=document.getElementById('settings-'+rich.key(slide)),host=document.getElementById('homepage-'+slide+'-blocks');if(!hidden||!host)continue;
  let list=[];
  function sync(){hidden.value=JSON.stringify(list);const legacy=document.getElementById('settings-'+prefix+'Description');if(legacy)legacy.value=list[0]?.text||'';hidden.dispatchEvent(new Event('input',{bubbles:true}));window.TutuHomepageText.preview(document);}
  function labelled(text,control){const label=document.createElement('label');label.append(document.createTextNode(text),control);return label;}
  function render(){
   host.replaceChildren(...list.map((b,index)=>{
    const row=document.createElement('fieldset');row.className='homepage-block-editor';row.dataset.blockIndex=String(index);
    const legend=document.createElement('legend');legend.textContent='內文 '+(index+1);row.append(legend);
    const text=document.createElement('textarea');text.rows=3;text.maxLength=1000;text.value=b.text;text.dataset.richKey='text';row.append(labelled('內文文字',text));
    const tools=document.createElement('div');tools.className='form-grid';
    const size=document.createElement('input');size.type='number';size.min='12';size.max='40';size.step='1';size.required=true;size.value=b.fontSize;size.dataset.richKey='fontSize';tools.append(labelled('字體大小（px）',size));
    for(const [key,options] of [['effect',rich.effects],['underline',rich.underlines]]){
     const select=document.createElement('select');select.dataset.richKey=key;for(const value of options){const o=document.createElement('option');o.value=value;o.textContent=names[key][value];select.append(o);}select.value=b[key];tools.append(labelled(key==='effect'?'文字特效':'底線特效',select));
    }
    const background=document.createElement('input');background.type='color';background.dataset.richKey='background';background.value=b.background==='transparent'?'#fff4cc':b.background;
    const transparent=document.createElement('input');transparent.type='checkbox';transparent.dataset.richKey='transparent';transparent.checked=b.background==='transparent';tools.append(labelled('背景顏色',background),labelled('透明背景',transparent));row.append(tools);
    const links=document.createElement('div');links.className='form-grid';
    for(const [key,label,max] of [['linkText','超連結文字',100],['url','連結網址',2000]]){const input=document.createElement('input');input.type='text';input.maxLength=max;input.value=b[key];input.dataset.richKey=key;input.placeholder=key==='url'?'https://… 或 #line-catalog':'';links.append(labelled(label,input));}row.append(links);
    const actions=document.createElement('div');actions.className='actions';
    for(const [label,delta] of [['上移',-1],['下移',1],['移除本段',0]]){const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=label;button.disabled=delta!==0&&(index+delta<0||index+delta>=list.length);button.dataset.orderBoundary=String(button.disabled);button.onclick=()=>{if(delta===0)list.splice(index,1);else [list[index],list[index+delta]]=[list[index+delta],list[index]];sync();render();};actions.append(button);}row.append(actions);return row;
   }));document.getElementById('homepage-'+slide+'-add-block').dataset.limitReached=String(list.length>=20);paintLocks();
  }
  function update(event){const key=event.target.dataset.richKey,row=event.target.closest('[data-block-index]');if(!key||!row)return;const i=Number(row.dataset.blockIndex),b=list[i];
   if(key==='transparent')b.background=event.target.checked?'transparent':row.querySelector('[data-rich-key="background"]').value;
   else if(key==='background'){b.background=event.target.value;row.querySelector('[data-rich-key="transparent"]').checked=false;}
   else b[key]=key==='fontSize'?Number(event.target.value):event.target.value;
   sync();
  }
  host.addEventListener('input',update);host.addEventListener('change',update);
  document.getElementById('homepage-'+slide+'-add-block').onclick=()=>{if(list.length>=20)return;list.push(rich.block());sync();render();host.lastElementChild?.querySelector('textarea')?.focus();};
  editors.set(slide,()=>{try{list=JSON.parse(hidden.value||'[]');}catch{list=[];}render();});
 }
 const refresh=()=>editors.forEach(render=>render());window.TutuHomepageRichEditor={refresh};new MutationObserver(paintLocks).observe(document.querySelector('.content'),{attributes:true,attributeFilter:['aria-busy']});refresh();
})();

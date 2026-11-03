/* Repeated tag controls participate in the existing form-buffer allowlist. */
(function(){
 'use strict';const model=window.TutuTaxonomy;if(!model)return;
 const prefixes=['work','line-product','festival'];
 function fill(prefix,item){const values=model.tagsFor(item);for(const key of ['topic',...Object.keys(model.dimensions)]){const input=document.getElementById(prefix+'-tags-'+key);if(input)input.value=key==='topic'?values[key]:values[key].join('、');}}
 function read(prefix){const values={};for(const key of ['topic',...Object.keys(model.dimensions)])values[key]=document.getElementById(prefix+'-tags-'+key)?.value||'';return model.parse(values);}
 for(const prefix of prefixes){
  const form=document.getElementById(prefix==='line-product'?'line-product-form':prefix+'-form');if(!form)continue;
  const fieldset=document.createElement('fieldset');fieldset.className='catalog-tag-editor';const legend=document.createElement('legend');legend.textContent='官網分類與篩選標籤';fieldset.append(legend);
  const help=document.createElement('p');help.textContent='各欄可填多個標籤，以「、」分隔。儲存並發布後，官網依這組資料篩選；空白代表不指定。';fieldset.append(help);
  for(const key of ['topic',...Object.keys(model.dimensions)]){
   const label=document.createElement('label'),input=document.createElement(key==='topic'?'select':'input');input.id=prefix+'-tags-'+key;label.textContent=key==='topic'?'主題':model.dimensions[key];
   if(key==='topic')for(const t of model.topics){const option=document.createElement('option');option.value=t.id;option.textContent=t.label;input.append(option);}
   else{input.type='text';input.maxLength=500;input.placeholder=key==='characters'?'例如：藍寶、桃寶':key==='holidays'?'例如：世界善良日、聖誕節':'例如：感謝、問候、上課';}
   label.append(input);fieldset.append(label);
  }
  form.querySelector('.actions')?.before(fieldset);fill(prefix,{});
 }
 window.TutuTagsAdmin={fill,read};
})();

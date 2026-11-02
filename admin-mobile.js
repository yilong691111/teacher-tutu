/* Responsive admin navigation and labelled record cards. Content edits stay in existing handlers. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory;else factory(root.document,root);})(typeof window==='undefined'?globalThis:window,function(doc,win){
 'use strict';
 const select=doc.getElementById('admin-mobile-page'),heading=doc.getElementById('page-title');
 const buttons=Array.from(doc.querySelectorAll('.side nav button[data-page]'));
 const current=()=>buttons.find(button=>button.classList.contains('selected'));
 function sync(){if(select&&current())select.value=current().dataset.page;}
 if(select){
  select.replaceChildren(...buttons.map(button=>{const option=doc.createElement('option');option.value=button.dataset.page;option.textContent=button.textContent.trim();return option;}));
  select.addEventListener('change',()=>{
   const requested=select.value,button=buttons.find(item=>item.dataset.page===requested);
   if(button&&!button.disabled)button.click(); // Preserve pending-editor checks, initialization locks and existing navigation.
   sync();
   if(current()?.dataset.page===requested&&win.matchMedia('(max-width: 900px)').matches){
    heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});win.scrollTo({top:0,behavior:'auto'});
   }
  });
  if(heading)new win.MutationObserver(sync).observe(heading,{childList:true,subtree:true});
  sync();
 }
 function labelRows(table){
  const labels=Array.from(table.querySelectorAll('thead th'),cell=>cell.textContent.trim());
  for(const row of table.querySelectorAll('tbody tr'))for(const [index,cell] of Array.from(row.cells).entries()){
   if(cell.colSpan>1){cell.removeAttribute('data-label');cell.removeAttribute('data-mobile-actions');continue;}
   const label=labels[index]||'';cell.setAttribute('data-label',label);
   if(/操作|管理與順序|排序/.test(label))cell.setAttribute('data-mobile-actions','true');else cell.removeAttribute('data-mobile-actions');
  }
 }
 for(const table of doc.querySelectorAll('.table-scroll table')){
  labelRows(table);new win.MutationObserver(()=>labelRows(table)).observe(table,{childList:true,subtree:true});
 }
});

/* Local-first report editor; saved content uses the existing publish/backup boundary. */
(function(){
 'use strict';const model=window.TutuReports;if(!model||!$('#reports-table'))return;
 let publishedSite=window.TUTU_BOOTSTRAP||{reports:[]};
 let sequence=0;const fields={title:'title',subtitle:'subtitle',label:'label',summary:'summary',body:'body',closing:'closing',buttonText:'button-text',buttonLink:'button-link'};
 const reports=()=>model.reportsFor(site);
 const missingReports=()=>{const ids=new Set(reports().map(r=>r.id));return model.reportsFor(publishedSite).filter(r=>!ids.has(r.id));};
 const pageLabel=(list,r)=>r?.published===false?'未公開':'第 '+(r?list.slice(0,list.indexOf(r)+1).filter(x=>x.published!==false).length:list.filter(x=>x.published!==false).length+1)+' 頁';
 function render(){const list=reports(),missing=missingReports();$('#reports-sync').hidden=!missing.length;$('#reports-sync-message').textContent=missing.length?'本機草稿缺少 '+missing.length+' 篇已發布報導：'+missing.map(r=>r.title).join('、')+'。載入後可編輯；原有草稿不會被覆蓋。':'';$('#reports-table').innerHTML=list.map((r,i)=>`<tr><td><small class="muted">${pageLabel(list,r)}</small>${clean(r.title)}<small class="muted">${clean(r.subtitle||'')}</small></td><td><span class="status ${r.published===false?'off':''}">${r.published===false?'已隱藏':'展示中'}</span></td><td><div class="collection-actions"><button type="button" data-report-action="up" data-id="${clean(r.id)}" aria-label="上移 ${clean(r.title)}" ${i===0?'disabled':''}>↑</button><button type="button" data-report-action="down" data-id="${clean(r.id)}" aria-label="下移 ${clean(r.title)}" ${i===list.length-1?'disabled':''}>↓</button><button type="button" data-report-action="edit" data-id="${clean(r.id)}">編輯${pageLabel(list,r)}報導</button><button type="button" data-report-action="toggle" data-id="${clean(r.id)}">${r.published===false?'顯示':'隱藏'}</button><button type="button" data-report-action="delete" data-id="${clean(r.id)}">刪除</button></div></td></tr>`).join('');$('#reports-empty').hidden=!!list.length;$('#reports-count').textContent=`共 ${list.length} 篇報導，官網 ${list.filter(r=>r.published!==false).length} 頁展示中`;}
 function edit(id){
  if(window.TutuFormDrafts?.canOpen('report-form')===false)return false;const list=reports(),r=list.find(x=>x.id===id);if(id&&!r){toast('這篇特別報導已不存在。',true);return false;}
  $('#report-form').reset();$('#report-id').value=r?.id||uniqueId('report-',list)+'-'+(++sequence);$('#report-origin-id').value=r?.id||'';
  for(const [key,input] of Object.entries(fields))$('#report-'+input).value=r?.[key]||'';
  for(let i=1;i<=3;i++)for(const key of ['label','title','body'])$('#report-section-'+i+'-'+key).value=r?.sections?.[i-1]?.[key]||'';
  $('#report-published').checked=r?.published!==false;$('#report-form-heading').textContent=(r?'編輯':'新增')+pageLabel(list,r)+'報導';$('#report-form').hidden=false;window.TutuFormDrafts?.begin('report-form',$('#report-id').value);$('#report-form').scrollIntoView({behavior:'smooth',block:'start'});return true;
 }
 function persist(list,form=false){window.TutuGitHub.validateData({...site,reports:list});site.reports=list;return form?saveFormDraft('report-form'):saveLocal();}
 $('#report-form').addEventListener('submit',e=>{
  e.preventDefault();const button=$('#save-report');if(button.disabled)return;button.disabled=true;let release=()=>{};
  try{release=beginEditorSave('report-form');const values={id:$('#report-id').value,published:$('#report-published').checked,sections:[]};for(const [key,input] of Object.entries(fields))values[key]=$('#report-'+input).value.trim();for(let i=1;i<=3;i++){const section={};for(const key of ['label','title','body'])section[key]=$('#report-section-'+i+'-'+key).value.trim();if(Object.values(section).some(Boolean)){const original=reports().find(r=>r.id===$('#report-origin-id').value);values.sections.push({...original?.sections?.[i-1],...section});}}
   const next=model.save(reports(),$('#report-origin-id').value||null,values);$('#report-origin-id').value=values.id;const saved=persist(next,true);if(saved)$('#report-form').hidden=true;render();toast(saved?'特別報導已儲存為草稿，可預覽後發布。':'修改目前只保留於此頁面，請先下載備份或完成發布。',!saved);
  }catch(err){toast(err.message,true);}finally{release();button.disabled=false;}
 });
 $('#reports-table').addEventListener('click',e=>{
  const button=e.target.closest('button[data-report-action]');if(!button||button.disabled)return;const {reportAction:action,id}=button.dataset;if(action==='edit'){edit(id);return;}if(window.TutuFormDrafts?.canLeave()===false)return;
  try{const list=reports(),item=list.find(r=>r.id===id);if(!item)throw new Error('特別報導已不存在。');let next;
   if(action==='delete'){if(!confirm('確定從草稿刪除「'+item.title+'」？發布後才會從官網移除，可從 JSON 備份復原。'))return;next=list.filter(r=>r.id!==id);}
   else if(action==='toggle')next=model.save(list,id,{...item,published:item.published===false});else next=window.TutuContent.moveItem(list,id,action==='up'?-1:1);
   const saved=persist(next);if($('#report-id').value===id)$('#report-form').hidden=true;render();toast(saved?'文章清單已更新為草稿，發布後生效。':'變更仍在此頁，請先下載備份。',!saved);
  }catch(err){toast(err.message,true);}
 });
 $('#sync-published-reports').onclick=()=>{if(window.TutuFormDrafts?.canLeave()===false)return;try{const missing=missingReports();if(!missing.length){render();return;}const saved=persist([...reports(),...structuredClone(missing)]);render();edit(missing[0].id);toast(saved?'已載入缺少的官網報導，原有草稿已保留。':'報導已載入此頁，但草稿未能儲存，請先下載備份。',!saved);}catch(err){toast(err.message,true);}};
 $('#new-report').onclick=()=>edit();$('#cancel-report').onclick=()=>{if(window.TutuFormDrafts?.canOpen('report-form')!==false)$('#report-form').hidden=true;};$('#preview-reports').onclick=()=>{if(window.TutuFormDrafts?.allowPreview()===false)return;if(saveLocal()){const list=reports(),selected=list.find(r=>r.id===$('#report-id').value&&r.published!==false)||list.find(r=>r.published!==false);window.open('index.html?draft=1#'+(selected?model.anchor(selected):'idiom-story'),'_blank','noopener');}};
 window.TutuReportsAdmin={render,edit,setPublished:data=>{publishedSite=data;render();},open:page=>{if(page==='reports')render();}};render();
})();

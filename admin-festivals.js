/* Multi-collection festival editor; uses the existing local draft/publish boundary. */
(function(){
 'use strict';
 const model=window.TutuFestivals;if(!model)return;
 const list=()=>model.festivalsFor(site,window.TutuGitHub.FESTIVAL_DEFAULTS);
 const fields={title:'title',subtitle:'subtitle',holidayName:'holiday-name',eventDate:'date',description:'description',tags:'tags',imageAlt:'image-alt',buttonText:'button-text',buttonLink:'button-link'};
 const ids=()=>$('#festival-work-ids').value.split(',').filter(Boolean);
 const notifySelection=()=>{$('#festival-work-ids').dispatchEvent(new Event('input',{bubbles:true}));};
 function syncSelection(){
  const chosen=ids(),works=new Map((site.gallery||[]).map(w=>[w.id,w]));
  const options=(site.gallery||[]).filter(w=>w.published!==false).map(w=>{
   const label=document.createElement('label');label.className='festival-work-option';const input=document.createElement('input');input.type='checkbox';input.checked=chosen.includes(w.id);input.setAttribute('aria-label','加入輪播 '+w.title);
   input.onchange=()=>{const next=ids().filter(id=>id!==w.id);if(input.checked)next.push(w.id);$('#festival-work-ids').value=next.join(',');syncSelection();notifySelection();};
   const image=document.createElement('img');image.src=safeImg(w.image);image.alt='';image.loading='lazy';const text=document.createElement('span');text.textContent=w.title;label.append(input,image,text);return label;
  });
  $('#festival-work-options').replaceChildren(...options);
  const selected=chosen.map((id,index)=>{
   const row=document.createElement('div');row.className='festival-selected-work';const w=works.get(id),label=document.createElement('span');label.textContent=`${index+1}. ${w?.title||'已移除作品'}${w?.published===false?'（已隱藏，播放時略過）':''}`;row.append(label);
   for(const [text,delta] of [['上移',-1],['下移',1],['移除',0]]){
    const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=text;b.setAttribute('aria-label',text+' '+(w?.title||id));b.disabled=delta!==0&&(index+delta<0||index+delta>=chosen.length);
    b.onclick=()=>{const next=ids();if(delta===0)next.splice(index,1);else [next[index],next[index+delta]]=[next[index+delta],next[index]];$('#festival-work-ids').value=next.join(',');syncSelection();notifySelection();};row.append(b);
   }return row;
  });
  $('#festival-selected-works').replaceChildren(...selected);$('#festival-work-count').textContent=`已選 ${chosen.length} 件；封面先播放，再依下列順序播放。`;
 }
 function edit(id,copy=false){
  if(window.TutuFormDrafts?.canOpen('festival-form')===false)return false;
  const f=list().find(x=>x.id===id);if(id&&!f){toast('這個系列已不存在，請重新開啟。',true);return false;}
  releaseFestivalPreview();$('#festival-form').reset();
  const value=f?{...f}:{title:'塗塗的日常',subtitle:'',holidayName:'',eventDate:'',description:'',tags:'',imageAlt:'',buttonText:'看看系列作品 →',buttonLink:'#gallery',workIds:[],published:true};
  if(copy){value.eventDate='';value.subtitle=(value.subtitle||value.holidayName).slice(0,85)+'（複本）';}
  const identity=copy||!f?'f'+Array.from(crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16).padStart(8,'0')).join(''):f.id;$('#festival-id').value=identity;$('#festival-origin-id').value=copy?'':f?.id||'';
  for(const [key,input] of Object.entries(fields))$('#festival-'+input).value=value[key]||'';
  $('#festival-date').required=identity!=='legacy-festival';$('#festival-published').checked=value.published!==false;$('#festival-work-ids').value=(value.workIds||[]).join(',');
  const cover=(site.gallery||[]).find(w=>w.id===value.coverWorkId),image=cover?.image||value.image;
  $('#festival-cover-work-id').value=value.coverWorkId||'';$('#festival-current-image').value=image||'';$('#festival-image-preview').src=safeImg(image);$('#festival-image-preview').hidden=!image;$('#festival-file').value='';
  const select=$('#festival-gallery-image');select.replaceChildren(new Option('保留目前圖片',''));(site.gallery||[]).filter(w=>w.published!==false).forEach(w=>select.add(new Option(w.title,w.id)));
  $('#festival-form-heading').textContent=copy?'複製節慶系列':f?'編輯節慶系列':'新增節慶系列';$('#festival-form').hidden=false;syncSelection();window.TutuFormDrafts?.begin('festival-form',identity);$('#festival-form').scrollIntoView({behavior:'smooth',block:'start'});return true;
 }
 function render(){
  const all=model.ordered(list());$('#festival-list-count').textContent=`共 ${all.length} 個系列，依日期排列；舊系列未設定日期時排在最後。`;
  $('#festivals-table').replaceChildren(...all.map(f=>{
   const row=document.createElement('tr');const cover=document.createElement('td'),img=document.createElement('img');img.src=safeImg(f.image);img.alt='';cover.append(img);
   const date=document.createElement('td');date.textContent=f.eventDate||'尚未設定日期';const name=document.createElement('td');const title=document.createElement('strong');title.textContent=f.holidayName;const sub=document.createElement('small');sub.textContent=f.subtitle||f.title;name.append(title,sub);
   const status=document.createElement('td');status.textContent=f.published===false?'已隱藏':'展示中';const actions=document.createElement('td');
   for(const [text,action] of [['編輯',()=>edit(f.id)],['複製',()=>edit(f.id,true)],[f.published===false?'展示':'隱藏',()=>change(f,'visibility')],['刪除',()=>change(f,'delete')]]){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=action;actions.append(b);}
   row.append(cover,date,name,status,actions);return row;
  }));$('#festival-list-empty').hidden=all.length>0;
 }
 function persist(next){window.TutuGitHub.validateData({...site,festivals:next});site.festivals=next;const saved=saveLocal();render();return saved;}
 function change(f,action){
  if(window.TutuFormDrafts?.canLeave()===false)return;
  if(action==='delete'&&!confirm(`確定刪除「${f.subtitle||f.holidayName}」？發布前可從備份復原。`))return;
  try{const next=action==='delete'?list().filter(x=>x.id!==f.id):model.saveFestival(list(),f.id,{...f,published:f.published===false});const saved=persist(next);if($('#festival-id').value===f.id)$('#festival-form').hidden=true;toast(saved?'節慶系列草稿已更新，發布後生效。':'修改只留在此頁，請先備份。',!saved);}catch(err){toast(err.message,true);}
 }
 $('#new-festival').onclick=()=>edit();$('#cancel-festival').onclick=()=>{if(window.TutuFormDrafts?.canOpen('festival-form')!==false)$('#festival-form').hidden=true;};
 $('#festival-form').addEventListener('submit',async e=>{
  e.preventDefault();const button=$('#save-festival');if(button.disabled)return;button.disabled=true;let release=()=>{};
  try{
   release=beginEditorSave('festival-form');const id=$('#festival-id').value,original=list().some(f=>f.id===id)?id:null,value={id};for(const [key,input] of Object.entries(fields))value[key]=$('#festival-'+input).value.trim();
   value.tags=value.tags.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).join('\n');value.workIds=ids();value.published=$('#festival-published').checked;value.image=$('#festival-current-image').value;value.coverWorkId=$('#festival-cover-work-id').value;
   const file=$('#festival-file').files[0];if(file){value.image=await(window.TutuFormDrafts?.imageFor(file)||compressImage(file));value.coverWorkId='';}
   const next=model.saveFestival(list(),original||null,value);window.TutuGitHub.validateData({...site,festivals:next});site.festivals=next;$('#festival-id').value=id;$('#festival-origin-id').value=id;$('#festival-cover-work-id').value=value.coverWorkId;$('#festival-current-image').value=value.image;$('#festival-file').value='';
   const saved=saveFormDraft('festival-form');if(saved)$('#festival-form').hidden=true;render();toast(saved?'節慶系列已儲存為草稿，可預覽後發布。':'修改只留在此頁，請先下載備份。',!saved);
  }catch(err){toast(err.message,true);}finally{release();button.disabled=false;}
 });
 window.TutuFestivalsAdmin={render,edit,syncSelection};render();
})();

/* Integrates GitHub publishing with the existing, local-first editor. */
(function(){
 'use strict';
 const api=window.TutuGitHub,client=new api.Client();
 const PENDING_KEY='teacher-tutu-github-pending-v1';
 const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
 const write=(key,value)=>{try{value?localStorage.setItem(key,JSON.stringify(value)):localStorage.removeItem(key)}catch{/* No credential is ever passed here. */}};
 let baseBlob=null,baseline=null,remote=null,busy=false,needsAdoption=false,conflicted=false;
 let pending=read(PENDING_KEY),pollTimer=null,pollCount=0;
 const status=(message,state='idle')=>{const el=$('#github-progress');el.textContent=message;el.dataset.state=state;};
 const dirty=()=>baseline===null||JSON.stringify(site)!==baseline;
 const displayTime=()=>new Date().toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'});
 function renderState(){
  $('#connection-badge').textContent=client.connected?'● GitHub 已連線':'● 尚未連線 GitHub';
  $('#connection-badge').classList.toggle('connected',client.connected);
  $('#github-connect').hidden=client.connected;
  $('#github-disconnect').hidden=!client.connected;
  $('#github-token').disabled=client.connected||busy;
  $('#github-connection-message').textContent=client.connected?'已連線：yilong691111。可以將這份草稿提交到官網專案。':'尚未連線。你仍可編輯、預覽與備份草稿。';
  const formPending=window.TutuFormDrafts?.hasPending()||false;
  $('#github-publish').disabled=busy||!client.connected||!baseBlob||needsAdoption||conflicted||!!pending?.uncertain||!dirty()||formPending;
  $('#github-publish').textContent=busy?'處理中…':'↗ 發布到官網';
  $('#github-adopt-local').hidden=!needsAdoption;
  $('#github-check-submission').hidden=!pending?.uncertain;
  $('#draft-state').textContent=needsAdoption?'本機草稿需要與官網對照':conflicted?'官網已有新版，請先同步':baseline===null?'尚未確認官網版本':dirty()?'● 有尚未發布的修改':'✓ 草稿與目前 GitHub 內容一致';
  const all=site.gallery||[],shown=all.filter(w=>w.published!==false).length;
  const festivals=window.TutuFestivals.festivalsFor(site,api.FESTIVAL_DEFAULTS),festival=`${festivals.filter(f=>f.published!==false).length}／${festivals.length} 個展示中`;
  const products=site.lineProducts||[],characters=window.TutuContent?.charactersFor(site)||[];
  $('#publish-summary').textContent=`這份草稿：${all.length} 件作品（展示 ${shown} 件、隱藏 ${all.length-shown} 件），${(site.news||[]).length} 則公告。LINE 貼圖 ${products.filter(p=>p.published!==false).length}／${products.length} 款、人物夥伴 ${characters.filter(c=>c.published!==false).length}／${characters.length} 位。節慶系列：${festival}。特別報導 ${window.TutuReports.reportsFor(site).filter(r=>r.published!==false).length}／${window.TutuReports.reportsFor(site).length} 篇。`;
  if(formPending)$('#publish-summary').textContent+=' 尚有未儲存的編輯，請先在上方繼續編輯或放棄暫存。';
 }
 async function run(fn){
  if(busy)return;
  busy=true;
  const controls=$$('.page button,.page input,.page select,.page textarea,#header-publish').map(el=>[el,el.disabled]);
  controls.forEach(([el])=>el.disabled=true);$('.content').setAttribute('aria-busy','true');
  renderState();
  try{await fn();}catch(e){
   if(e.code==='auth')client.disconnect();
   if(e.code==='conflict')conflicted=true;
   status(e.message,e.code==='conflict'?'conflict':'failed');toast(e.message,true);
  }finally{
   busy=false;controls.forEach(([el,disabled])=>el.disabled=disabled);$('.content').removeAttribute('aria-busy');renderState();
  }
 }
 function recordBase(snapshot){
  remote=snapshot;baseBlob=snapshot.baseBlob;baseline=JSON.stringify(snapshot.data);
  needsAdoption=false;conflicted=false;draftBaseBlob=baseBlob;
 }
 function reconcile(snapshot,local=loadLocal(),metadata={baseBlob:draftStore.read()?.baseBlob}){
  const result=api.resolveDraft(local,snapshot,metadata);
  remote=snapshot;baseline=JSON.stringify(snapshot.data);site=result.data;
  baseBlob=result.baseBlob;needsAdoption=result.needsAdoption;conflicted=false;
  draftBaseBlob=baseBlob;
  saveLocal();
  render();
  status(needsAdoption?'已保留本機草稿。請先下載備份，再選「重新讀取官網」，或確認「採用本機草稿」作為下一個版本。':result.dirty?'已讀取 GitHub 最新版本。本機草稿已保留，完成預覽後即可發布。':'已讀取 GitHub 最新版本。編輯作品或公告後，即可預覽及發布。');
 }
 function savePending(value){pending=value;write(PENDING_KEY,value);}
 function setRunLink(url){
  const link=$('#github-run-link');
  if(url&&url.startsWith(api.REPO_URL+'/actions')){link.href=url;link.hidden=false;}
 }
 async function checkDeployment(){
  if(!pending||pending.uncertain)return;
  clearTimeout(pollTimer);const expected=pending.commit;
  $('#github-refresh-status').hidden=false;
  try{
   const result=await client.deployment(expected);
   if(pending?.commit!==expected)return;
   setRunLink(result.url);
   if(result.state==='succeeded'){
    status('✓ GitHub Pages 已完成部署，官網已更新。可按「開啟官網」查看。','succeeded');
    $('#github-refresh-status').hidden=true;savePending(null);return;
   }
   if(result.state==='failed'){
    status('內容已提交到 GitHub，但 Pages 部署未成功。請查看建置紀錄；不必重複發布同一份內容。','failed');return;
   }
   status(result.state==='waiting'?'內容已提交，正在等候 GitHub Pages 建置。':'內容已提交，GitHub Pages 正在建置。完成後官網才會更新。','building');
   if(++pollCount<18)pollTimer=setTimeout(checkDeployment,10000);
   else status('內容已提交。GitHub Pages 仍在處理中，可稍後按「重新確認發布狀態」。','building');
  }catch(e){status('內容已提交，但暫時無法取得部署狀態。請稍後重新確認，無需重複發布。','building');}
 }
 $('#header-publish').onclick=()=>showPage('publish');
 window.addEventListener('tutu:draft',e=>{
  $('#draft-saved').textContent=e.detail.saved?'草稿儲存於此裝置 · '+displayTime():'草稿目前只保留於此頁面';
  renderState();
 });
 window.addEventListener('tutu:form-buffer',renderState);
 $('#github-connect-form').addEventListener('submit',e=>{
  e.preventDefault();
  run(async()=>{
   const token=$('#github-token').value;$('#github-token').value='';
   status('正在向 GitHub 驗證連線…');
   const snapshot=await client.connect(token);
   // Keep in-memory edits even if persistent storage has reached its quota.
   const pristine=baseline!==null&&!dirty();
   reconcile(snapshot,pristine?null:structuredClone(site),{baseBlob:draftBaseBlob});
   if(!needsAdoption)status('GitHub 連線成功。預覽草稿後，即可發布。');
  });
 });
 $('#github-disconnect').onclick=()=>{
  if(busy)return;client.disconnect();$('#github-token').value='';renderState();toast('已中斷 GitHub 連線，草稿仍保留。');
 };
 $('#github-reload').onclick=()=>{
  if(dirty()&&!confirm('讀取官網會取代目前這份草稿。請先下載完整備份 JSON。確定要繼續？'))return;
  run(async()=>{status('正在重新讀取官網…');const snapshot=await client.loadSnapshot();recordBase(snapshot);site=structuredClone(snapshot.data);saveLocal();render();status('已同步 GitHub 最新內容，可繼續編輯。');});
 };
 $('#github-adopt-local').onclick=()=>{
  if(!remote||!confirm('本機草稿可能較舊。採用後，下一次發布會用這份草稿取代目前官網內容。請確認已備份，並檢查兩份內容。確定採用？'))return;
  recordBase(remote);saveLocal();status('已採用本機草稿。發布前仍會再次檢查官網版本。');renderState();
 };
 $('#github-publish').onclick=()=>{
  window.TutuFormDrafts?.flush();if(window.TutuFormDrafts?.hasPending()){status('還有未儲存的編輯，請先儲存或放棄暫存。','failed');return;}
  try{api.validateData(site);}catch(e){status(e.message,'failed');return;}
  $('#publish-confirm-summary').textContent=$('#publish-summary').textContent;
  $('#publish-confirm').showModal();
 };
 $('#publish-confirm-cancel').onclick=()=>$('#publish-confirm').close();
 $('#publish-confirm-go').onclick=()=>{
  $('#publish-confirm').close();
  run(async()=>{
   const submitted=structuredClone(site);status('正在檢查官網版本並提交內容，請保持此頁面開啟…','building');
   let result;
   try{result=await client.publish(submitted,baseBlob);}catch(e){
    if(e.code==='uncertain'){savePending({commit:e.commit,baseBlob:e.baseBlob,uncertain:true});setRunLink(api.REPO_URL+'/actions');status(e.message,'uncertain');return;}
    throw e;
   }
   recordBase({data:submitted,baseBlob:result.baseBlob,head:result.commit});saveLocal();
   savePending({commit:result.commit,baseBlob:result.baseBlob,uncertain:false});pollCount=0;
   await checkDeployment();
  });
 };
 $('#github-check-submission').onclick=()=>run(async()=>{
  if(!pending?.uncertain)return;
  status('正在確認 GitHub 的實際版本…');const snapshot=await client.loadSnapshot();
  if(snapshot.baseBlob===pending.baseBlob){
   recordBase(snapshot);saveLocal();savePending({...pending,uncertain:false});pollCount=0;
   status('已確認內容成功提交，正在查詢部署。','building');await checkDeployment();
  }else if(snapshot.baseBlob===baseBlob){savePending(null);status('已確認這次內容尚未出現在官網分支。草稿已保留，可重新發布。');}
  else{conflicted=true;savePending(null);status('GitHub 已有不同的新版內容。請備份草稿並重新讀取官網。','conflict');}
 });
 $('#github-refresh-status').onclick=()=>{pollCount=0;checkDeployment();};
 window.addEventListener('beforeunload',e=>{if(busy||!$('#draft-storage-warning').hidden){e.preventDefault();e.returnValue='';}});
 document.querySelectorAll('.side nav button').forEach(button=>button.addEventListener('click',renderState));
 renderState();
 run(async()=>{
  const snapshot=await client.loadSnapshot();reconcile(snapshot);
  if(pending?.uncertain)status('上次提交結果尚未確認，請先按「確認提交結果」。','uncertain');
  else if(pending)await checkDeployment();
 }).finally(()=>{window.TutuPublishReady=true;window.dispatchEvent(new CustomEvent('tutu:publish-ready'));});
})();

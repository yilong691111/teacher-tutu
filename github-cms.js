/* GitHub is the write authorization boundary. Credentials remain in memory. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.TutuGitHub=api;
})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const REPO='yilong691111/teacher-tutu',BRANCH='main';
 const REPO_URL='https://github.com/'+REPO;
 const SITE_URL='https://yilong691111.github.io/teacher-tutu/';
 const imagePattern=/^(?:assets\/(?:works\/[\w-]+|[\w-]+)\.(?:webp|jpe?g)|data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/=\r\n]+)$/;
 class CmsError extends Error{constructor(message,code){super(message);this.code=code;}}
 function error(message,code='invalid'){return new CmsError(message,code);}
 function validateData(data){
  if(!data||typeof data.settings!=='object'||!data.settings||Array.isArray(data.settings)||!Array.isArray(data.gallery)||!Array.isArray(data.news))throw error('網站資料格式不正確。');
  if(!String(data.settings.brand||'').trim())throw error('請填寫品牌名稱。');
  try{const u=new URL(data.settings.lineUrl);if(u.protocol!=='https:'||u.username||u.password)throw 0;}catch{throw error('LINE 商店網址必須是完整的 HTTPS 網址。');}
  for(const [kind,list] of [['作品',data.gallery],['公告',data.news]]){
   const ids=new Set();
   for(const item of list){
    if(!item||typeof item.id!=='string'||!/^[\w-]{1,100}$/.test(item.id)||ids.has(item.id))throw error(kind+' ID 不正確或重複。');
    ids.add(item.id);
    if(typeof item.title!=='string'||!item.title.trim()||item.title.length>150)throw error(kind+'標題不可空白或超過 150 字。');
    if(kind==='作品'&&!imagePattern.test(item.image||''))throw error('作品圖片必須是網站內圖片或上傳的圖片。');
    if(kind==='公告'&&(!/^\d{4}-\d{2}-\d{2}$/.test(item.date||'')||Number.isNaN(Date.parse(item.date))||new Date(item.date).toISOString().slice(0,10)!==item.date))throw error('公告日期格式不正確。');
   }
  }
  if(new TextEncoder().encode(JSON.stringify(data)).length>12*1024*1024)throw error('資料超過 12 MB，請減少或縮小新圖片後再發布。');
  return data;
 }
 function serializeData(data){validateData(data);return 'window.TUTU_BOOTSTRAP = '+JSON.stringify(data,null,2).replace(/</g,'\\u003c')+';\n';}
 function parseData(text){
  const match=String(text).match(/^\s*window\.TUTU_BOOTSTRAP\s*=\s*([\s\S]*?)\s*;?\s*$/);
  if(!match)throw error('找不到網站內容，請勿匯入程式檔。');
  return validateData(JSON.parse(match[1]));
 }
 function decodeBase64(text){return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(text.replace(/\s/g,'')),c=>c.charCodeAt(0)));}
 function resolveDraft(local,remote,metadata){
  const same=local&&JSON.stringify(local)===JSON.stringify(remote.data);
  const needsAdoption=!!local&&!same&&metadata?.baseBlob!==remote.baseBlob;
  return {data:local||remote.data,baseBlob:needsAdoption?null:remote.baseBlob,needsAdoption,dirty:!!local&&!same};
 }
 class DraftStore{
  constructor(storage){this.storage=storage;this.key='teacher-tutu-static-cms-v2';this.legacy='teacher-tutu-static-cms-v1';}
  read(){
   try{
    const record=JSON.parse(this.storage.getItem(this.key)||'null');
    if(record?.data?.settings&&Array.isArray(record.data.gallery)&&Array.isArray(record.data.news))return record;
    const legacy=JSON.parse(this.storage.getItem(this.legacy)||'null');
    if(legacy?.settings&&Array.isArray(legacy.gallery)&&Array.isArray(legacy.news))return {data:legacy,baseBlob:null};
   }catch{/* Storage may be unavailable. */}
   return null;
  }
  save(data,baseBlob){this.storage.setItem(this.key,JSON.stringify({data,baseBlob:baseBlob||null}));}
  clear(){this.storage.removeItem(this.key);this.storage.removeItem(this.legacy);}
 }
 class Client{
  #token='';
  constructor({fetch:fetcher=globalThis.fetch.bind(globalThis),timeout=30000}={}){this.fetch=fetcher;this.timeout=timeout;}
  disconnect(){this.#token='';}
  get connected(){return !!this.#token;}
  async request(path,{method='GET',body,publicOnly=false}={}){
   // Callers cannot supply another origin, repository, or endpoint family.
   if(path!=='/user'&&path!=='/repos/'+REPO&&!path.startsWith('/repos/'+REPO+'/'))throw error('不支援的 GitHub 目的地。');
   const headers={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
   if(this.#token&&!publicOnly)headers.Authorization='Bearer '+this.#token;
   if(body)headers['Content-Type']='application/json';
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),this.timeout);
   let response;
   try{
    response=await this.fetch('https://api.github.com'+path,{method,headers,body:body?JSON.stringify(body):undefined,signal:controller.signal,cache:'no-store',credentials:'omit',redirect:'error'});
    if(!response.ok){
     const status=response.status;
     if(status===401)throw error('授權碼無效或已到期，請重新連線。','auth');
     if(status===403||status===404)throw error('無法存取專案。請確認授權碼選取 teacher-tutu，並開啟 Contents：Read and write 權限。','permission');
     if(status===409||status===422)throw error('GitHub 已有較新的版本或拒絕這次更新；草稿已保留，請先重新讀取官網資料。','conflict');
     if(status===429)throw error('GitHub 要求稍後再試。草稿仍保留在此頁面。','rate');
     throw error('GitHub 暫時無法完成要求（'+status+'），請稍後再試。','api');
    }
    return await response.json();
   }catch(e){
    if(e instanceof CmsError)throw e;
    throw error('網路中斷或等待逾時，請確認連線後再試。','network');
   }finally{clearTimeout(timer);}
  }
  async loadSnapshot(){
   const head=await this.request('/repos/'+REPO+'/git/ref/heads/'+BRANCH);
   const file=await this.request('/repos/'+REPO+'/contents/data/site-data.js?ref='+encodeURIComponent(head.object.sha));
   const blob=file.encoding==='base64'?file:await this.request('/repos/'+REPO+'/git/blobs/'+file.sha);
   return {data:parseData(decodeBase64(blob.content)),baseBlob:file.sha,head:head.object.sha};
  }
  async connect(token){
   this.disconnect();
   if(typeof token!=='string'||!token.trim())throw error('請先貼上 GitHub 授權碼。');
   this.#token=token.trim();
   try{
    const user=await this.request('/user');
    if(user.login.toLowerCase()!=='yilong691111')throw error('請使用網站擁有者 yilong691111 的授權碼。','account');
    const repo=await this.request('/repos/'+REPO);
    if(!repo.permissions?.push)throw error('此帳號沒有網站寫入權限。','permission');
    const snapshot=await this.loadSnapshot();return {...snapshot,login:user.login};
   }catch(e){this.disconnect();throw e;}
  }
  async publish(data,baseBlob){
   if(!this.connected)throw error('請先連線 GitHub。','auth');
   if(!baseBlob)throw error('請先讀取官網最新版本。','conflict');
   const js=serializeData(data),json=JSON.stringify(data,null,2)+'\n';
   const snapshot=await this.loadSnapshot();
   if(snapshot.baseBlob!==baseBlob)throw error('官網已有新的內容，已停止發布以保護其他修改。請先備份草稿，再讀取最新官網。','conflict');
   const head=await this.request('/repos/'+REPO+'/git/commits/'+snapshot.head);
   const jsBlob=await this.request('/repos/'+REPO+'/git/blobs',{method:'POST',body:{content:js,encoding:'utf-8'}});
   const jsonBlob=await this.request('/repos/'+REPO+'/git/blobs',{method:'POST',body:{content:json,encoding:'utf-8'}});
   const tree=await this.request('/repos/'+REPO+'/git/trees',{method:'POST',body:{base_tree:head.tree.sha,tree:[
    {path:'data/site-data.js',mode:'100644',type:'blob',sha:jsBlob.sha},
    {path:'data/site.json',mode:'100644',type:'blob',sha:jsonBlob.sha}
   ]}});
   const commit=await this.request('/repos/'+REPO+'/git/commits',{method:'POST',body:{message:'Update Teacher Tutu content from admin',tree:tree.sha,parents:[snapshot.head]}});
   try{
    await this.request('/repos/'+REPO+'/git/refs/heads/'+BRANCH,{method:'PATCH',body:{sha:commit.sha,force:false}});
   }catch(e){
    if(e.code==='network'||e.code==='api')throw Object.assign(error('GitHub 提交結果尚未確認。請按「確認提交結果」，確認前不要再次發布。','uncertain'),{commit:commit.sha,baseBlob:jsBlob.sha});
    throw e;
   }
   return {commit:commit.sha,baseBlob:jsBlob.sha,url:REPO_URL+'/commit/'+commit.sha};
  }
  async deployment(commit){
   if(!/^[\w-]+$/.test(commit))throw error('版本編號不正確。');
   const result=await this.request('/repos/'+REPO+'/actions/runs?head_sha='+encodeURIComponent(commit)+'&per_page=30',{publicOnly:true});
   const run=(result.workflow_runs||[]).find(r=>r.head_sha===commit&&r.name==='pages build and deployment');
   if(!run)return {state:'waiting'};
   const url=typeof run.html_url==='string'&&run.html_url.startsWith(REPO_URL+'/actions/runs/')?run.html_url:REPO_URL+'/actions';
   if(run.status!=='completed')return {state:'building',url};
   return {state:run.conclusion==='success'?'succeeded':'failed',url,conclusion:run.conclusion};
  }
 }
 return {Client,DraftStore,validateData,serializeData,parseData,resolveDraft,REPO,BRANCH,REPO_URL,SITE_URL};
});

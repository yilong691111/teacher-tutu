const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const cms = (()=>{try{return require('./github-cms.js')}catch{return {}}})();
const data = ()=>JSON.parse(fs.readFileSync(__dirname+'/data/site.json','utf8'));
const encoded = x=>Buffer.from(x).toString('base64');
function server({conflict=false,race=false,denied=false,uncertain=false,abort=false}={}) {
 const calls=[];let updated=false;
 const fetch=async(url,options={})=>{
  const path=new URL(url).pathname;const method=options.method||'GET';
  const body=options.body?JSON.parse(options.body):null;calls.push({path,method,body,headers:options.headers});
  let status=200,result;
  if(path==='/user')result={login:'yilong691111'};
  else if(path.endsWith('/teacher-tutu'))result={permissions:{push:true}};
  else if(path.endsWith('/git/ref/heads/main'))result={object:{sha:updated?'newcommit':'head'}};
  else if(path.endsWith('/contents/data/site-data.js'))result={sha:conflict?'changed':'base',content:encoded('window.TUTU_BOOTSTRAP = '+JSON.stringify(data())+';'),encoding:'base64'};
  else if(path.endsWith('/git/commits/head'))result={tree:{sha:'original-tree'}};
  else if(path.endsWith('/git/blobs'))result={sha:'blob-'+calls.length};
  else if(path.endsWith('/git/trees'))result={sha:'newtree'};
  else if(path.endsWith('/git/commits'))result={sha:'newcommit'};
  else if(path.endsWith('/git/refs/heads/main')){
   if(abort)throw new DOMException('Timed out','AbortError');
   if(uncertain)throw new TypeError('Network failed');
   if(race){status=422;result={message:'not fast forward'}}else{updated=true;result={object:{sha:'newcommit'}}}
  }else if(path.endsWith('/actions/runs'))result={workflow_runs:[{head_sha:'unrelated',status:'completed',conclusion:'success'},{name:'pages build and deployment',head_sha:'newcommit',status:'completed',conclusion:'failure',html_url:'https://github.com/yilong691111/teacher-tutu/actions/runs/1'}]};
  else throw new Error('Unexpected endpoint '+path);
  if(denied&&method==='POST'){status=403;result={message:'Resource not accessible by personal access token'}};
  return new Response(JSON.stringify(result),{status});
 };
 return {calls,fetch};
}
test('serialization round trips Chinese content without executing imported JavaScript',()=>{
 assert.equal(typeof cms.serializeData,'function');
 const d=data();d.news[0].title='塗塗更新 🎨';
 const text=cms.serializeData(d);const ctx={window:{}};vm.runInNewContext(text,ctx);
 assert.deepEqual(JSON.parse(JSON.stringify(ctx.window.TUTU_BOOTSTRAP)),d);
 assert.deepEqual(cms.parseData(text),d);
 assert.throws(()=>cms.parseData('window.TUTU_BOOTSTRAP = {}; alert(1);'));
});
test('validation rejects unsafe images and duplicate IDs before any publish',()=>{
 assert.equal(typeof cms.validateData,'function');const d=data();
 d.gallery[0].image='https://evil.example/tracker';assert.throws(()=>cms.validateData(d),/圖片/);
 const duplicate=data();duplicate.gallery[1].id=duplicate.gallery[0].id;assert.throws(()=>cms.validateData(duplicate),/ID/);
 const invalid=data();invalid.news[0].date='wrong';assert.throws(()=>cms.validateData(invalid),/日期/);
});
test('authenticated publish commits both data files atomically and never forces main',async()=>{
 assert.equal(typeof cms.Client,'function');const s=server();const client=new cms.Client({fetch:s.fetch});
 const snapshot=await client.connect('test-token');assert.equal(snapshot.baseBlob,'base');
 const d=data();d.news[0].title='發布測試';const out=await client.publish(d,'base');assert.equal(out.commit,'newcommit');
 const tree=s.calls.find(x=>x.path.endsWith('/git/trees')).body;
 assert.equal(tree.base_tree,'original-tree');assert.deepEqual(tree.tree.map(x=>x.path),['data/site-data.js','data/site.json']);
 const commit=s.calls.find(x=>x.path.endsWith('/git/commits')&&x.method==='POST').body;
 assert.deepEqual(commit.parents,['head']);
 const update=s.calls.find(x=>x.method==='PATCH');assert.equal(update.body.force,false);
 assert.ok(s.calls.every(x=>!JSON.stringify(x.body).includes('test-token')));
 client.disconnect();await assert.rejects(()=>client.publish(d,out.baseBlob),/連線/);
 assert.ok(s.calls.every(x=>x.path.startsWith('/repos/yilong691111/teacher-tutu')||x.path==='/user'));
});
test('stale base refuses writes; another unrelated commit is allowed only with unchanged content',async()=>{
 assert.equal(typeof cms.Client,'function');const s=server({conflict:true});const c=new cms.Client({fetch:s.fetch});await c.connect('test-token');
 await assert.rejects(()=>c.publish(data(),'base'),e=>e.code==='conflict');assert.equal(s.calls.filter(x=>x.method==='POST').length,0);
});
test('concurrent branch update rejects without force or a retry',async()=>{
 assert.equal(typeof cms.Client,'function');const s=server({race:true});const c=new cms.Client({fetch:s.fetch});await c.connect('test-token');
 await assert.rejects(()=>c.publish(data(),'base'),e=>e.code==='conflict');assert.equal(s.calls.filter(x=>x.method==='PATCH').length,1);
});
test('lost final response reports uncertain outcome without repeating writes',async()=>{
 assert.equal(typeof cms.Client,'function');const s=server({uncertain:true});const c=new cms.Client({fetch:s.fetch});await c.connect('test-token');
 await assert.rejects(()=>c.publish(data(),'base'),e=>e.code==='uncertain'&&e.commit==='newcommit');assert.equal(s.calls.filter(x=>x.method==='PATCH').length,1);
});
test('read-only tokens produce actionable permission errors and no branch update',async()=>{
 assert.equal(typeof cms.Client,'function');const s=server({denied:true});const c=new cms.Client({fetch:s.fetch});await c.connect('test-token');
 await assert.rejects(()=>c.publish(data(),'base'),/權限/);assert.equal(s.calls.filter(x=>x.method==='PATCH').length,0);
});
test('deployment checks match the exact commit and distinguish failed builds',async()=>{
 assert.equal(typeof cms.Client,'function');const s=server();const c=new cms.Client({fetch:s.fetch});
 const result=await c.deployment('newcommit');assert.equal(result.state,'failed');
 assert.ok(!s.calls[0].headers.Authorization);
});
test('unknown or stale local drafts need explicit adoption and are never discarded',()=>{
 assert.equal(typeof cms.resolveDraft,'function');const remote={data:data(),baseBlob:'latest'};
 const local=data();local.news[0].title='尚未發布的草稿';
 const unknown=cms.resolveDraft(local,remote,null);assert.equal(unknown.needsAdoption,true);assert.equal(unknown.data.news[0].title,'尚未發布的草稿');
 const stale=cms.resolveDraft(local,remote,{baseBlob:'old'});assert.equal(stale.needsAdoption,true);
 const current=cms.resolveDraft(local,remote,{baseBlob:'latest'});assert.equal(current.needsAdoption,false);assert.equal(current.dirty,true);
 const empty=cms.resolveDraft(null,remote,null);assert.equal(empty.dirty,false);assert.equal(empty.baseBlob,'latest');
});
test('native browser fetch is called with the global receiver',async()=>{
 assert.equal(typeof cms.Client,'function');const original=globalThis.fetch;const s=server();
 globalThis.fetch=function(...args){assert.equal(this,globalThis);return s.fetch(...args)};
 try{const c=new cms.Client();const result=await c.loadSnapshot();assert.equal(result.baseBlob,'base');}finally{globalThis.fetch=original;}
});
test('browser AbortError during final write also requires submission confirmation',async()=>{
 const s=server({abort:true});const c=new cms.Client({fetch:s.fetch});await c.connect('test-token');
 await assert.rejects(()=>c.publish(data(),'base'),e=>e.code==='uncertain'&&e.commit==='newcommit');
});
test('draft data and base are one atomic record, including quota failure and legacy migration',()=>{
 assert.equal(typeof cms.DraftStore,'function');const values=new Map();let quota=false;
 const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>{if(quota)throw new Error('quota');values.set(k,v)},removeItem:k=>values.delete(k)};
 const drafts=new cms.DraftStore(storage);values.set('teacher-tutu-static-cms-v1',JSON.stringify(data()));
 assert.equal(drafts.read().baseBlob,null);
 const v2=data();v2.news[0].title='新版官網';drafts.save(v2,'base-v2');
 assert.equal(drafts.read().data.news[0].title,'新版官網');assert.equal(drafts.read().baseBlob,'base-v2');
 const v3=data();v3.news[0].title='下次修改';quota=true;
 assert.throws(()=>drafts.save(v3,'base-v3'));assert.equal(drafts.read().baseBlob,'base-v2');assert.equal(drafts.read().data.news[0].title,'新版官網');
});

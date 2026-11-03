const {test}=require('node:test'),assert=require('node:assert/strict');
const image='data:image/png;base64,aGVsbG8=';
function memory(){const files=new Map();return {files,async get(path){return files.get(path)},async put(record){files.set(record.path,structuredClone(record))},async stage(data){const api=require('./image-assets.js'),record=await api.record(data);record.width=800;record.height=800;record.mobile=record.path.replace(/\.png$/,'-mobile.webp');record.mobileWidth=640;record.mobileHeight=640;await this.put({...record,path:record.mobile,mime:'image/webp'});await this.put(record);return record.path;}};}
test('圖片獨立存檔：相同圖片共用路徑，資料檔不再包含 base64 並包含手機圖',async()=>{
 const api=require('./image-assets.js'),store=memory(),data={settings:{heroIntroImage:image},gallery:[{id:'w',image}]},before=structuredClone(data),result=await api.prepare(data,{},store);
 assert.equal(result.data.gallery[0].image,result.data.settings.heroIntroImage);assert.match(result.data.gallery[0].image,/^assets\/works\/upload-[a-f0-9]{64}\.png$/);assert.ok(!JSON.stringify(result.data).includes('base64'));assert.equal(result.files.length,2);assert.equal(result.data.imageAssets.length,1);assert.equal(result.data.imageAssets[0].mobileWidth,640);assert.deepEqual(data,before);
 const again=await api.prepare(result.data,result.data,memory());assert.equal(again.files.length,0);
});
test('缺少未發布圖檔會阻止發布；既有官網圖片可沿用且不重複上傳',async()=>{
 const api=require('./image-assets.js'),store=memory(),path=await store.stage(image),data={settings:{heroIntroImage:path}};await assert.rejects(()=>api.prepare(data,{},memory()),/圖片.*遺失|找不到.*圖片/);assert.equal((await api.prepare(data,data,memory())).files.length,0);
});
test('完整與未完成編輯備份攜帶獨立圖檔，還原後可再次發布',async()=>{
 const api=require('./image-assets.js'),store=memory(),path=await store.stage(image),data={settings:{heroIntroImage:path}},backup=await api.backup(data,store),target=memory();assert.equal(backup.format,'tutu-site-backup-v2');assert.equal(backup.assets.length,2);assert.equal(backup.data.settings.heroIntroImage,path);
 const restored=await api.restore(backup,target);assert.deepEqual(restored,data);assert.equal((await api.prepare(restored,{},target)).files.length,2);
 const unfinished={format:'tutu-form-buffers-v1',records:[{values:{'work-existing-image':path}}]},bundle=await api.backup(unfinished,store);assert.equal(bundle.format,'tutu-form-buffers-v1');assert.equal(bundle.assets.length,2);
 await assert.rejects(()=>api.restore({...backup,assets:[{...backup.assets[0],path:'admin.js'}]},target),/圖片.*路徑|圖片.*備份/);
});
test('獨立圖檔與兩份資料在同一棵 Git tree 發布，準備圖片失敗不更動分支',async()=>{
 const fs=require('node:fs'),cms=require('./github-cms.js'),api=require('./image-assets.js'),data={settings:{brand:'塗塗老師',lineUrl:'https://line.me/'},gallery:[],news:[]},store=memory(),calls=[];data.settings.heroIntroImage=image;
 const client=new cms.Client({assets:{prepare:(d,r)=>api.prepare(d,r,store)}});client.request=async(path,{method='GET',body}={})=>{calls.push({path,method,body});if(path==='/user')return {login:'yilong691111'};if(path.endsWith('/teacher-tutu'))return {permissions:{push:true}};if(path.endsWith('/git/commits/head'))return {tree:{sha:'tree'}};if(path.endsWith('/git/blobs'))return {sha:'blob-'+calls.length};if(path.endsWith('/git/trees'))return {sha:'tree2'};if(path.endsWith('/git/commits'))return {sha:'commit'};if(method==='PATCH')return {};throw Error(path);};client.loadSnapshot=async()=>({data:{...data,settings:{...data.settings,heroIntroImage:'assets/tutu-hero.webp'}},baseBlob:'base',head:'head'});await client.connect('test-token');const result=await client.publish(data,'base');
 const tree=calls.find(x=>x.path.endsWith('/git/trees')).body.tree;assert.equal(tree.filter(x=>x.path.startsWith('assets/works/upload-')).length,2);assert.equal(tree.filter(x=>x.path.startsWith('data/')).length,2);assert.ok(!JSON.stringify(result.data).includes(image));assert.equal(calls.find(x=>x.method==='PATCH').body.force,false);
 const fail=new cms.Client({assets:{prepare:async()=>{throw Error('圖片遺失')}}});fail.request=client.request;fail.loadSnapshot=client.loadSnapshot;await fail.connect('test-token');const count=calls.filter(x=>x.method==='PATCH').length;await assert.rejects(()=>fail.publish(data,'base'),/圖片遺失/);assert.equal(calls.filter(x=>x.method==='PATCH').length,count);
});

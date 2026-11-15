const {test}=require('node:test'),assert=require('node:assert/strict');
const uuid='058d294b-e3b2-4f09-81d2-38b897062dd9';
const pdf='assets/coloring/upload-'+'a'.repeat(64)+'.pdf';
const origin='https://yilong691111.github.io';
async function handler(record=async()=>({visitors:4,downloads:{friends:2}})){
 const {createHandler}=await import('./statistics/handler.mjs');
 return createHandler({snapshot:record,record,loadBooks:async()=>[{id:'friends',pdf,published:true},{id:'hidden',pdf,published:false}]});
}
function post(body,site=origin){return new Request('https://stats.test/',{method:'POST',headers:{origin:site,'content-type':'application/json'},body:JSON.stringify(body)})}
test('public statistics show shared totals and reject writes from other sites',async()=>{
 const h=await handler(),read=await h(new Request('https://stats.test/',{headers:{origin}}));
 assert.equal(read.headers.get('access-control-allow-origin'),origin);assert.deepEqual(await read.json(),{visitors:4,downloads:{friends:2}});
 assert.equal((await h(post({event:'visit',visitorId:uuid},'https://other.test'))).status,403);
 assert.equal((await h(post({event:'visit',visitorId:uuid},''))).status,403);
});
test('visitor identity is hashed before persistence and valid downloads target only published books',async()=>{
 const events=[],h=await handler(async row=>{events.push(row);return {visitors:1,downloads:{friends:1}}});
 assert.equal((await h(post({event:'visit',visitorId:uuid}))).status,200);
 assert.match(events[0].visitorHash,/^[a-f0-9]{64}$/);assert.ok(!JSON.stringify(events[0]).includes(uuid));
 assert.equal((await h(post({event:'download',visitorId:uuid,eventId:uuid,bookId:'friends',pdf}))).status,200);
 assert.equal(events[1].bookId,'friends');assert.equal(events[1].eventId,uuid);
 for(const change of [{bookId:'hidden'},{bookId:'missing'},{pdf:'https://other.test/file.pdf'},{eventId:'bad'}]){
  const r=await h(post({event:'download',visitorId:uuid,eventId:uuid,bookId:'friends',pdf,...change}));assert.equal(r.status,400);
 }
 assert.equal(events.length,2);
});
test('malformed and oversized events never reach storage; backend errors remain unavailable',async()=>{
 let writes=0;const h=await handler(async()=>{writes++;throw Error('private connection detail')});
 assert.equal((await h(post({event:'visit',visitorId:'bad'}))).status,400);
 assert.equal((await h(post({event:'reset',visitorId:uuid}))).status,400);
 assert.equal((await h(post({event:'visit',visitorId:uuid,padding:'x'.repeat(1100)}))).status,413);
 const r=await h(post({event:'visit',visitorId:uuid}));assert.equal(r.status,503);assert.ok(!(await r.text()).includes('private'));assert.equal(writes,1);
});
test('same-browser identity survives a new client and concurrent visits do not double submit',async()=>{
 const {createClient}=require('./statistics-client.js'),values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 let visits=0;const fetch=async(_url,options)=>{if(options.method==='POST')visits++;return new Response(JSON.stringify({visitors:7,downloads:{friends:3}}))};
 const a=createClient({endpoint:'https://stats.test',key:'public',storage,randomUUID:()=>uuid,fetch});
 const [x,y]=await Promise.all([a.visit(),a.visit()]);assert.equal(x.visitors,7);assert.equal(y.visitors,7);assert.equal(visits,1);
 const b=createClient({endpoint:'https://stats.test',key:'public',storage,randomUUID:()=>{throw Error('should reuse identity')},fetch});
 await b.visit();assert.equal(visits,2);
});
test('preview traffic makes no writes and failed responses cannot fabricate zero counts',async()=>{
 const {createClient}=require('./statistics-client.js');let calls=0;
 const preview=createClient({enabled:false,fetch:async()=>{calls++;throw Error('must not call')}});
 assert.equal(await preview.visit(),null);assert.equal(await preview.download({id:'friends',pdf}),null);assert.equal(calls,0);
 const client=createClient({endpoint:'https://stats.test',key:'public',storage:{getItem(){throw Error()},setItem(){throw Error()}},randomUUID:()=>uuid,fetch:async()=>new Response('{}',{status:503})});
 assert.equal(await client.visit(),null);assert.equal(await client.read(),null);
});
test('a completed PDF response starts one download before recording; failed files never count',async()=>{
 const {createDownloader}=require('./statistics-client.js');let saves=0,records=0;
 const download=createDownloader({fetch:async()=>new Response('%PDF-1.7\nexample',{headers:{'Content-Type':'application/pdf'}}),start:(_blob,b)=>{assert.equal(b.id,'friends');saves++},record:()=>{assert.equal(saves,1);records++}});
 await Promise.all([download({id:'friends',pdf}),download({id:'friends',pdf})]);assert.equal(saves,1);assert.equal(records,1);
 for(const response of [new Response('missing',{status:404}),new Response('<html>error</html>')]){
  const fail=createDownloader({fetch:async()=>response,start:()=>{throw Error('must not save')},record:()=>{records++}});await assert.rejects(()=>fail({id:'friends',pdf}));
 }
 assert.equal(records,1);
});

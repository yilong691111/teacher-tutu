const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const model=require('./coloring-model.js');
const files=require('./coloring-assets.js');
const pdf=require('./coloring-pdf.js');
const {PDFDocument}=require('./vendor/pdf-lib.min.js');
const path='assets/coloring/upload-'+'a'.repeat(64)+'.pdf';
const book=()=>({id:'friends',title:'塗塗的快樂日常',category:'合集篇',description:'一起著色',image:'assets/tutu-boy.webp',pdf:path,pageCount:2,pages:[{id:'p1',title:'藍寶'},{id:'p2',title:'桃寶'}],fileSize:123,published:true});
test('coloring collections validate categories, stable page identity and page counts',()=>{
 assert.doesNotThrow(()=>model.validate({coloringBooks:[book()]}));
 for(const change of [b=>b.category='其他',b=>b.pageCount=3,b=>b.pages[1].id='p1',b=>b.pdf='https://evil.test/a.pdf',b=>b.image='../bad.png',b=>b.fileSize=51*1024*1024]){const b=book();change(b);assert.throws(()=>model.validate({coloringBooks:[b]}));}
 assert.throws(()=>model.validate({coloringBooks:[book(),book()]}));
 assert.deepEqual(model.visible({coloringBooks:[book(),{...book(),id:'hidden',published:false}]}).map(b=>b.id),['friends']);
});
test('page moves preserve all identities and never mutate the source list',()=>{
 const original=book().pages;const next=model.move(original,'p1',1);
 assert.deepEqual(next.map(p=>p.id),['p2','p1']);assert.equal(original[0].id,'p1');
 assert.deepEqual(model.move(next,'p2',-1),next);
 assert.throws(()=>model.move(next,'missing',1));
});
test('page ordering changes the downloaded PDF itself and rejects missing or duplicated pages',async()=>{
 const source=await PDFDocument.create();source.addPage([100,100]);source.addPage([200,200]);source.addPage([300,300]);const bytes=await source.save();
 const output=await pdf.reorder(bytes,[2,0,1]);const result=await PDFDocument.load(output);
 assert.deepEqual(result.getPages().map(p=>p.getWidth()),[300,100,200]);
 await assert.rejects(()=>pdf.reorder(bytes,[0,0,2]));await assert.rejects(()=>pdf.reorder(bytes,[0,1]));
 await assert.rejects(()=>pdf.inspect(new TextEncoder().encode('not a pdf')));
});
test('pending PDFs are content addressed, included in publishing and portable backups',async()=>{
 const d=await PDFDocument.create();d.addPage();const row=await files.record(await d.save());const data={coloringBooks:[{...book(),pdf:row.path,pageCount:1,pages:[book().pages[0]]}]};
 const rows=new Map([[row.path,row]]),store={get:async p=>rows.get(p),getOrFetch:async p=>rows.get(p),put:async r=>rows.set(r.path,r)};
 const prepared=await files.prepare(data,{},store);assert.deepEqual(prepared.files.map(r=>r.path),[row.path]);
 assert.equal((await files.prepare(data,data,store)).files.length,0);
 const backup=await files.backupFiles(data,store);assert.equal(backup.length,1);
 await assert.rejects(()=>files.restoreFiles([{...row,path:path}],store),/不符/);
 await assert.rejects(()=>files.restoreFiles([{...row,mime:'text/html'}],store));
 rows.clear();await assert.rejects(()=>files.prepare(data,{},store),/PDF/);
 await files.restoreFiles(backup,store);assert.ok(rows.has(row.path));
});
test('website validation and publication review include coloring edits',()=>{
 const cms=require('./github-cms.js'),review=require('./publish-review.js');const site=JSON.parse(fs.readFileSync('data/site.json'));
 assert.doesNotThrow(()=>cms.validateData({...site,coloringBooks:[book()]}));
 assert.throws(()=>cms.validateData({...site,coloringBooks:[{...book(),category:'無效'}]}));
 const changes=review.compare(site,{...site,coloringBooks:[book()]});assert.ok(changes.some(c=>c.area==='著色本'&&c.actions.includes('新增')));
 const edit=book();edit.pages.reverse();assert.ok(review.compare({...site,coloringBooks:[book()]},{...site,coloringBooks:[edit]}).some(c=>c.area==='著色本'));
});
test('coloring covers are protected while any book still references them',()=>{
 const media=require('./media-model.js'),site={settings:{},gallery:[],news:[],characters:[],coloringBooks:[book()]};
 const cover=media.catalog(site).find(x=>x.image===book().image);assert.ok(cover.uses.some(x=>x.kind==='coloringBooks'));
 assert.throws(()=>media.remove(site,[book().image]),/保護|使用/);
});

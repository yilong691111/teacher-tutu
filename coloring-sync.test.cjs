const {test}=require('node:test');
const assert=require('node:assert/strict');
const cms=require('./github-cms.js');
const release=require('./coloring-release.js');
test('principal book reaches a teacher-era draft without restoring an intentionally removed teacher book',()=>{
 const local={settings:{},gallery:[],news:[],coloringRevision:release.version,coloringBooks:[{id:'custom',title:'我的書'}],coloringAdditionsRevision:'20261107-tutu-teacher-v1'};
 const principal={id:'malan-principal',title:'瑪藍校長｜暖心校園著色本',pages:[{id:'p1',title:'校門口的早安'}]},teacher={id:'tutu-teacher',title:'塗塗老師'};
 const remote={...local,coloringBooks:[teacher,principal],coloringAdditionsRevision:'20261108-malan-principal-v1'};
 const result=cms.hydrateDraft(local,remote);
 assert.deepEqual(result.coloringBooks.map(b=>b.id),['custom','malan-principal']);
 result.coloringBooks[1].title='我的校長著色本';result.coloringBooks[1].published=false;
 assert.deepEqual(cms.hydrateDraft(result,remote),result);
 result.coloringBooks.pop();assert.deepEqual(cms.hydrateDraft(result,remote),result);
});
function fixture(){
 const before={settings:{brand:'塗塗'},gallery:[],news:[{id:'n1',title:'原公告'}],coloringBooks:structuredClone(release.previousBooks)};
 const published={...structuredClone(before),coloringRevision:release.version};
 published.coloringBooks=published.coloringBooks.map(b=>({...b,title:b.title+'九頁版',description:'九個不同情境',pdf:'assets/coloring/upload-'+'b'.repeat(64)+'.pdf',image:'assets/works/coloring-updated.png',pageCount:9,fileSize:456,pages:Array.from({length:9},(_,i)=>({id:'new-'+i,title:'新情境'+(i+1)}))}));
 return {before,published};
}
test('old one-page drafts receive the nine-page edition while unrelated edits and custom book titles survive',()=>{
 const {before,published}=fixture();before.news[0].title='未發布的公告';before.coloringBooks[1].title='我的著色本名稱';before.coloringBooks[2].published=false;
 const original=structuredClone(before),result=cms.resolveDraft(before,{data:published,baseBlob:'new'},{baseBlob:'old'});
 assert.ok(result.data.coloringBooks.every(b=>b.pageCount===9));
 assert.ok(result.data.coloringBooks.every(b=>b.pages.length===9&&b.fileSize===456&&b.pdf.endsWith('b'.repeat(64)+'.pdf')));
 assert.equal(result.data.coloringBooks[1].title,'我的著色本名稱');assert.equal(result.data.coloringBooks[2].published,false);
 assert.equal(result.data.news[0].title,'未發布的公告');assert.equal(result.data.coloringRevision,release.version);
 assert.equal(result.needsAdoption,true);assert.deepEqual(before,original);
});
test('an independently uploaded or reordered PDF is kept as one atomic file-and-page group',()=>{
 const {before,published}=fixture();const book=before.coloringBooks[1];
 Object.assign(book,{pdf:'assets/coloring/upload-'+'c'.repeat(64)+'.pdf',pageCount:3,fileSize:789,pages:[{id:'my-3',title:'我的第三頁'},{id:'my-1',title:'我的第一頁'},{id:'my-2',title:'我的第二頁'}]});
 const result=cms.hydrateDraft(before,published),found=result.coloringBooks.find(b=>b.id===book.id);
 for(const key of ['pdf','pageCount','fileSize','pages'])assert.deepEqual(found[key],book[key]);
 assert.equal(found.image,'assets/works/coloring-updated.png');
});
test('explicit book removals and custom ordering survive the edition upgrade',()=>{
 const {before,published}=fixture();const removed=before.coloringBooks[2].id;
 before.coloringBooks=before.coloringBooks.filter(b=>b.id!==removed).reverse();const ids=before.coloringBooks.map(b=>b.id);
 assert.deepEqual(cms.hydrateDraft(before,published).coloringBooks.map(b=>b.id),ids);
 before.coloringBooks=[];assert.deepEqual(cms.hydrateDraft(before,published).coloringBooks,[]);
});
test('the upgrade runs once and a pristine old draft becomes the published edition',()=>{
 const {before,published}=fixture();const result=cms.resolveDraft(before,{data:published,baseBlob:'new'},{baseBlob:'old'});
 assert.deepEqual(result.data,published);assert.equal(result.needsAdoption,false);assert.equal(result.dirty,false);
 result.data.coloringBooks[1].title='新版之後的修改';result.data.coloringBooks[1].pdf=release.previousBooks[1].pdf;
 assert.deepEqual(cms.hydrateDraft(result.data,published),result.data);
});

test('new teacher book reaches an older draft without restoring deleted books or discarding edits',()=>{
 const {before,published}=fixture();before.coloringRevision=release.version;published.coloringAdditionsRevision=release.additionsVersion;
 before.coloringBooks=before.coloringBooks.slice(2).reverse();before.news[0].title='保留未發布的修改';
 const teacher={...structuredClone(published.coloringBooks[0]),id:'tutu-teacher',title:'塗塗老師｜九頁著色本'};published.coloringBooks.push(teacher);
 const oldIds=before.coloringBooks.map(b=>b.id),original=structuredClone(before),result=cms.hydrateDraft(before,published);
 assert.deepEqual(result.coloringBooks.map(b=>b.id),[...oldIds,'tutu-teacher']);assert.deepEqual(result.coloringBooks.at(-1),teacher);
 assert.equal(result.news[0].title,'保留未發布的修改');assert.equal(result.coloringAdditionsRevision,release.additionsVersion);assert.deepEqual(before,original);
});
test('a customized teacher book survives adoption and its later deletion remains intentional',()=>{
 const {before,published}=fixture();before.coloringRevision=release.version;published.coloringAdditionsRevision=release.additionsVersion;
 const teacher={...structuredClone(published.coloringBooks[0]),id:'tutu-teacher',title:'官網的版本'};published.coloringBooks.push(teacher);
 const custom={...structuredClone(teacher),title:'我的標題',published:false};custom.pages.reverse();before.coloringBooks.unshift(custom);
 const result=cms.hydrateDraft(before,published);assert.deepEqual(result.coloringBooks[0],custom);assert.equal(result.coloringBooks.filter(b=>b.id==='tutu-teacher').length,1);
 result.coloringBooks=result.coloringBooks.filter(b=>b.id!=='tutu-teacher');assert.deepEqual(cms.hydrateDraft(result,published),result);
});

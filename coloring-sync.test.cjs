const {test}=require('node:test');
const assert=require('node:assert/strict');
const cms=require('./github-cms.js');
const release=require('./coloring-release.js');
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

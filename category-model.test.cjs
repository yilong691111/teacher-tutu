const {test}=require('node:test'),assert=require('node:assert/strict');
const m=require('./category-model.js');
const fixture=()=>({settings:{brand:'塗塗'},gallery:[{id:'a',category:'萬聖節',title:'A',published:true,custom:'保留'},{id:'b',category:'生日祝福',title:'B',published:false},{id:'c',category:'萬聖節',title:'C'}],lineProducts:[{id:'p',category:'日常',custom:42}],categoryLists:{gallery:['生日祝福','萬聖節','空分類'],lineProducts:['日常']},festivals:[{id:'f'}]});
test('category order uses configured lists and retains existing categories missing from the registry',()=>{
 const s=fixture();s.gallery.push({id:'d',category:'新類別'});assert.deepEqual(m.names(s,'gallery'),['生日祝福','萬聖節','空分類','新類別']);assert.ok(m.names({gallery:[]},'gallery').includes('萬聖節'));assert.deepEqual(m.names({gallery:[],categoryLists:{gallery:[]}},'gallery'),[]);
});
test('rename updates hidden and visible records immutably while retaining IDs and metadata',()=>{
 const s=fixture(),r=m.categoryAction(s,'gallery','rename','生日祝福','生日快樂');assert.equal(r.gallery[1].category,'生日快樂');assert.equal(r.gallery[1].published,false);assert.deepEqual(r.gallery[0],s.gallery[0]);assert.deepEqual(r.lineProducts,s.lineProducts);assert.equal(s.gallery[1].category,'生日祝福');
});
test('category add merge delete and movement reject collisions and used-category deletion',()=>{
 const s=fixture();assert.throws(()=>m.categoryAction(s,'gallery','add','萬聖節'),/已存在/);assert.throws(()=>m.categoryAction(s,'gallery','add','全部'),/分類/);assert.throws(()=>m.categoryAction(s,'gallery','remove','萬聖節'),/使用/);
 const merged=m.categoryAction(s,'gallery','merge','萬聖節','生日祝福');assert.deepEqual(merged.gallery.map(x=>x.category),['生日祝福','生日祝福','生日祝福']);assert.deepEqual(merged.categoryLists.gallery,['生日祝福','空分類']);
 assert.deepEqual(m.categoryAction(s,'gallery','up','萬聖節').categoryLists.gallery,['萬聖節','生日祝福','空分類']);assert.ok(!m.categoryAction(s,'gallery','remove','空分類').categoryLists.gallery.includes('空分類'));
});
test('batch affects only selected IDs and preserves unknown fields and other collections',()=>{
 const s=fixture(),r=m.batch(s,'gallery',['a','c'],{category:'生日祝福',published:false,featured:true});assert.deepEqual(r.gallery[1],s.gallery[1]);assert.equal(r.gallery[0].custom,'保留');assert.equal(r.gallery[2].featured,true);assert.equal(s.gallery[0].category,'萬聖節');assert.deepEqual(r.lineProducts,s.lineProducts);
 assert.throws(()=>m.batch(s,'gallery',[],{published:false}),/選/);assert.throws(()=>m.batch(s,'gallery',['gone'],{published:false}),/不存在/);assert.throws(()=>m.batch(s,'lineProducts',['p'],{featured:true}),/欄位/);assert.throws(()=>m.batch(s,'gallery',['a'],{id:'evil'}),/欄位/);
});
test('moving selected groups keeps their relative order and preserves the rest',()=>{
 const s=fixture();assert.deepEqual(m.batch(s,'gallery',['c','a'],{},'bottom').gallery.map(x=>x.id),['b','a','c']);assert.deepEqual(m.batch(s,'gallery',['b','c'],{},'top').gallery.map(x=>x.id),['b','c','a']);
});
test('undo restores only the affected collection while preserving newer unrelated site edits',()=>{
 const before=fixture(),after=m.batch(before,'gallery',['a'],{published:false}),token=m.checkpoint(before,after,'gallery');after.settings={brand:'新名稱'};after.lineProducts=[{id:'new'}];const restored=m.undo(after,token);assert.deepEqual(restored.gallery,before.gallery);assert.equal(restored.settings.brand,'新名稱');assert.equal(restored.lineProducts[0].id,'new');
 const changed=structuredClone(after);changed.gallery[1].title='較新的修改';assert.throws(()=>m.undo(changed,token),/其他修改/);
});
test('validation rejects duplicate or malformed registries before publication',()=>{
 assert.throws(()=>m.validate({categoryLists:{gallery:['生日祝福','生日祝福']}}),/重複/);assert.throws(()=>m.validate({categoryLists:{gallery:['全部']}}),/分類/);assert.throws(()=>m.validate({categoryLists:{gallery:'bad'}}),/清單/);assert.doesNotThrow(()=>m.validate(fixture()));
});
test('filter changes prune hidden selections before a later batch mutation',()=>{
 assert.deepEqual(m.visibleSelection(['a','b','c','a'],[{id:'a'},{id:'c'}]),['a','c']);assert.deepEqual(m.visibleSelection(['a'],[]),[]);
});
test('public category filters retain legacy order until explicitly configured and omit hidden-only product categories',()=>{
 const s={gallery:[{id:'a',category:'角色'}],lineProducts:[{id:'a',category:'成語'},{id:'b',category:'萬聖節'},{id:'c',category:'隱藏類',published:false}]};
 assert.deepEqual(m.publicNames(s,'lineProducts'),['成語','萬聖節']);assert.equal(m.publicNames(s,'gallery').includes('其他'),false);
 s.categoryLists={lineProducts:['萬聖節','空類','成語','隱藏類']};assert.deepEqual(m.publicNames(s,'lineProducts'),['萬聖節','成語']);
});
test('mutation gate fails closed until form protection and initial synchronization are ready',()=>{
 for(const state of [{},{formsReady:true},{publishReady:true},{formsReady:true,publishReady:true,busy:true},{formsReady:true,publishReady:true,pending:true}])assert.equal(m.mutationReady(state),false);
 assert.equal(m.mutationReady({formsReady:true,publishReady:true,busy:false,pending:false}),true);
});
test('public categories hide all empty and hidden-only entries while admin lists retain configured order and empty categories',()=>{
 const s={gallery:[{id:'a',category:'角色'},{id:'b',category:'日常',published:false}],categoryLists:{gallery:['空分類','日常','角色']}};assert.deepEqual(m.publicNames(s,'gallery'),['角色']);assert.deepEqual(m.names(s,'gallery'),['空分類','日常','角色']);assert.deepEqual(m.publicNames({gallery:[]},'gallery'),[]);
});

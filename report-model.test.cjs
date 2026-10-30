const {test}=require('node:test'),assert=require('node:assert/strict');
let reports;try{reports=require('./report-model.js')}catch{reports={};}
const cms=require('./github-cms.js'),buffers=require('./form-drafts.js');
const article=(id='a')=>({id,title:'文章標題',body:'第一段\n\n第二段',sections:[],published:true});
test('legacy report remains complete while explicit empty and hidden collections stay intentional',()=>{
 const list=reports.reportsFor({});assert.equal(list.length,1);assert.equal(list[0].title,'聊天有梗，成語也有戲。');assert.equal(list[0].sections.length,3);assert.match(list[0].sections[0].body,/親子分享/);list[0].sections[0].title='改動';assert.notEqual(reports.reportsFor({})[0].sections[0].title,'改動');assert.deepEqual(reports.reportsFor({reports:[]}),[]);assert.equal(reports.reportsFor({reports:[{...article(),published:false}]})[0].published,false);
});
test('saving edits preserves unknown fields and other articles without mutating input',()=>{
 const original=[{...article(),extension:'keep'},article('b')],snapshot=structuredClone(original);const next=reports.save(original,'a',{...article(),title:'修改'});assert.equal(next[0].title,'修改');assert.equal(next[0].extension,'keep');assert.deepEqual(original,snapshot);assert.equal(reports.save(next,null,article('c'))[0].id,'c');assert.throws(()=>reports.save(next,'missing',article('missing')),/不存在/);assert.throws(()=>reports.save(next,null,article()),/重複/);assert.throws(()=>reports.save(next,'a',article('renamed')),/不可/);
});
test('report validation rejects malformed collections IDs sections states and unsafe or unpaired links',()=>{
 for(const value of [null,{},'bad'])assert.throws(()=>reports.validate({reports:value}),/報導/);
 for(const record of [{...article(),id:'../bad'},{...article(),title:' '},{...article(),body:''},{...article(),published:'yes'},{...article(),sections:[{title:'',body:'內容'}]},{...article(),sections:Array(4).fill({title:'段落',body:'內容'})},{...article(),buttonText:'點我',buttonLink:'javascript:alert(1)'},{...article(),buttonText:'點我',buttonLink:'https://user:pass@example.com'},{...article(),buttonText:'孤單按鈕'}])assert.throws(()=>reports.validate({reports:[record]}),/報導/);
 assert.throws(()=>reports.validate({reports:[article(),article()]}),/重複/);reports.validate({reports:[{...article(),buttonText:'貼圖',buttonLink:'#line-catalog'}]});reports.validate({reports:[{...article(),buttonText:'網站',buttonLink:'https://example.com/story'}]});
});
test('report anchors preserve the old report entry and give new articles stable distinct destinations',()=>{assert.equal(reports.anchor(reports.reportsFor({})[0]),'grade7-idioms');assert.equal(reports.anchor(article('custom')),'report-custom');});
test('GitHub validation and serialization include reports and preserve unrelated fields',()=>{
 const data={settings:{brand:'塗塗',lineUrl:'https://line.me/'},gallery:[],news:[],ownerExtra:{keep:true},reports:[article()]};const serialized=cms.serializeData(data),parsed=cms.parseData(serialized);assert.deepEqual(parsed,data);assert.throws(()=>cms.validateData({...data,reports:[{...article(),title:''}]}),/報導/);assert.deepEqual(cms.parseData(cms.serializeData({...data,reports:[]})).reports,[]);
});
test('unfinished report buffers preserve per-article identities and only allowed fields',()=>{
 const disk=new Map(),storage={get length(){return disk.size},key:i=>[...disk.keys()][i],getItem:k=>disk.get(k)||null,setItem:(k,v)=>disk.set(k,v),removeItem:k=>disk.delete(k)};const store=new buffers.Store(storage);store.put('report-form','new-a',{'report-id':'new-a','report-title':'第一篇','report-section-1-body':'原文','github-token':'secret'});store.put('report-form','new-b',{'report-id':'new-b','report-title':'第二篇'});assert.equal(new buffers.Store(storage).all().length,2);assert.equal(store.get('report-form','new-a').values['report-section-1-body'],'原文');assert.equal(store.get('report-form','new-a').values['github-token'],undefined);
});

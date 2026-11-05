const {test}=require('node:test'),assert=require('node:assert/strict');
test('removing auto-collected library images is reviewed as deletion while public content stays unchanged',()=>{
 const media=require('./media-model.js'),review=require('./publish-review.js'),before={settings:{},gallery:[{id:'work',title:'作品',image:'assets/works/a.png'}],characters:[],festivals:[]};
 const after=media.remove(before,['assets/works/a.png']),changes=review.compare(before,after);
 assert.equal(changes.length,1);assert.equal(changes[0].area,'圖片素材庫');assert.deepEqual(changes[0].actions,['刪除']);assert.match(changes[0].fields.at(-1).after,/官網既有圖片保留/);
 assert.deepEqual(review.compare(after,before)[0].actions,['恢復']);
});
test('變更明細列出新增修改隱藏與刪除，包含連動節慶',()=>{
 const review=require('./publish-review.js'),before={settings:{},gallery:[],news:[{id:'removed',title:'移除公告'}],lineProducts:[{id:'123',title:'原貼圖',published:true,image:'assets/tutu-hero.webp'}],festivals:[{id:'line-product-123',title:'原節慶',published:true}]};
 const after={...before,news:[{id:'added',title:'新公告'}],lineProducts:[{...before.lineProducts[0],title:'新貼圖',published:false,image:'assets/tutu-original.webp'}],festivals:[]};
 const changes=review.compare(before,after);
 assert.ok(changes.some(c=>c.area==='最新消息'&&c.actions.includes('新增')&&c.title==='新公告'));
 assert.ok(changes.some(c=>c.area==='最新消息'&&c.actions.includes('刪除')&&c.title==='移除公告'));
 const product=changes.find(c=>c.area==='LINE 貼圖');assert.ok(product.actions.includes('隱藏'));assert.ok(product.fields.some(f=>f.type==='image'));assert.ok(product.fields.some(f=>f.label==='標題'));
 assert.ok(changes.some(c=>c.area==='節慶系列'&&c.linked&&c.actions.includes('刪除')));
});
test('排序只在共同項目真正換位時顯示，新增一筆不會誤報整份清單換位',()=>{
 const review=require('./publish-review.js'),a={settings:{},gallery:[{id:'a',title:'A'},{id:'b',title:'B'}]};
 assert.equal(review.compare(a,{...a,gallery:[{id:'new',title:'新作品'},...a.gallery]}).filter(c=>c.actions.includes('排序')).length,0);
 assert.equal(review.compare(a,{...a,gallery:[...a.gallery].reverse()}).filter(c=>c.actions.includes('排序')).length,1);
});
test('舊資料載入預設系列與新首頁段落格式時，不會出現假的新增或修改',()=>{
 const review=require('./publish-review.js'),festivals=require('./festival-model.js'),content=require('./content-models.js'),reports=require('./report-model.js'),home=require('./homepage-text.js'),rich=require('./homepage-rich-text.js');
 const before={settings:{heroDescription:'原有內文'},gallery:[],news:[]},after=structuredClone(before);after.festivals=festivals.festivalsFor(before);after.characters=content.charactersFor(before);after.reports=reports.reportsFor(before);for(const slide of [1,2,3]){const s=home.values(before.settings,slide);after.settings[rich.key(slide)]=rich.blocksFor(before.settings,slide,s.heroDescription,s.heroDescriptionSize);}
 assert.deepEqual(review.compare(before,after),[]);
});
test('預覽網址統一帶入草稿模式與版本，同時保留各區定位',()=>{
 const review=require('./publish-review.js');for(const anchor of ['', 'characters','line-catalog','series','report-kindness']){const u=new URL(review.previewUrl(anchor),'https://example.test/');assert.equal(u.searchParams.get('draft'),'1');assert.ok(u.searchParams.get('v'));assert.equal(u.hash,anchor?'#'+anchor:'');}
 assert.throws(()=>review.previewUrl('javascript:alert(1)'));
});
test('首頁明細列出段落、特效、底線、背景與連結，不重複列出舊內文鏡像',()=>{
 const review=require('./publish-review.js'),rich=require('./homepage-rich-text.js'),before={settings:{heroDescription:'原文'}},after={settings:{heroDescription:'新文',heroTextBlocks:[{...rich.block('新文',24),effect:'glow',underline:'wavy',background:'#ffffff',linkText:'貼圖',url:'https://line.me/'}]}};
 const fields=review.compare(before,after).flatMap(c=>c.fields);
 for(const label of ['文字','字體大小','文字特效','底線特效','背景顏色','超連結文字','連結網址'])assert.ok(fields.some(f=>f.label.endsWith('／'+label)),label);
 assert.ok(!fields.some(f=>f.label==='heroDescription'));
});
test('明細安全顯示文字與圖片，不把內嵌圖片資料印進文字',()=>{
 const review=require('./publish-review.js'),nodes=[];function node(tag){const n={tag,children:[],textContent:'',append(...x){this.children.push(...x)},replaceChildren(){this.children=[]}};nodes.push(n);return n;}
 const container=node('div'),doc={createElement:node},image='data:image/png;base64,aGVsbG8=';
 review.render(doc,container,[{area:'首頁',title:'<script>alert(1)</script>',actions:['修改'],fields:[{label:'圖片',before:'assets/tutu-hero.webp',after:image,type:'image'},{label:'文字',before:'原文',after:'<img onerror=alert(1)>',type:'text'}]}]);
 assert.ok(nodes.some(n=>n.tag==='summary'&&n.textContent.includes('<script>')));assert.equal(nodes.filter(n=>n.tag==='img').length,2);assert.ok(nodes.every(n=>!String(n.textContent).includes('aGVsbG8=')));assert.ok(nodes.some(n=>n.tag==='p'&&n.textContent==='<img onerror=alert(1)>'));
});
test('各區共用預覽會保留定位，未儲存表單或草稿寫入失敗時不開啟舊內容',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),source=fs.readFileSync(__dirname+'/admin.js','utf8').match(/function previewDraft\([^\n]*?\)\{[^\n]+\}/)[0],opened=[],messages=[];let allow=true,saved=true;
 const context={saveLocal:()=>saved,toast:m=>messages.push(m),window:{TutuPublishReview:require('./publish-review.js'),TutuFormDrafts:{allowPreview:()=>allow},open:url=>opened.push(url)}};vm.runInNewContext(source,context);
 context.previewDraft({type:'click'});assert.equal(new URL(opened[0],'https://example.test').hash,'');context.previewDraft('series');assert.equal(new URL(opened[1],'https://example.test').hash,'#series');
 allow=false;context.previewDraft('characters');assert.equal(opened.length,2);allow=true;saved=false;context.previewDraft('line-catalog');assert.equal(opened.length,2);assert.match(messages[0],/草稿未能儲存/);
});

const {test}=require('node:test'),assert=require('node:assert/strict');
test('明確指定的主題及空白標籤優先，不因改名重新分類',()=>{
 const tags=require('./taxonomy.js'),p={title:'聖誕節成語',category:'萬聖節',catalogTags:{topic:'daily',characters:[],holidays:[],situations:['上課']}};
 assert.equal(tags.topicFor(p),'daily');assert.deepEqual(tags.tagsFor(p).holidays,[]);assert.equal(tags.matches(p,{situation:'上課'}),true);assert.equal(tags.matches(p,{holiday:'聖誕節'}),false);
});
test('角色節日情境可以交叉篩選，隱藏資料不進入選項',()=>{
 const tags=require('./taxonomy.js'),nav=require('./catalog-navigation.js'),base={id:'1',title:'作品',category:'日常',image:'assets/works/a.png',url:'https://store.line.me/stickershop/product/1/zh-Hant',catalogTags:{topic:'festive',characters:['藍寶'],holidays:['世界善良日'],situations:['感謝','祝福']}};
 assert.equal(nav.filterProducts([base],{character:'藍寶',holiday:'世界善良日',situation:'感謝'}).length,1);assert.equal(nav.filterProducts([base],{character:'桃寶'}).length,0);
 assert.deepEqual(tags.options([base,{...base,published:false,catalogTags:{...base.catalogTags,characters:['隱藏角色']}}],'characters'),['藍寶']);
 assert.equal(nav.topicFor(base),'festive');assert.equal(nav.filterProducts([base],{query:'善良'}).length,1);
});
test('舊資料保留原主題，標籤資料限制數量與格式並可安全往返',()=>{
 const tags=require('./taxonomy.js');assert.equal(tags.topicFor({title:'新年成語',category:'成語'}),'idioms');assert.equal(tags.topicFor({title:'生日祝福'}),'festive');
 const parsed=tags.parse({topic:'daily',characters:'藍寶、桃寶,藍寶',holidays:'',situations:'上課\n問候'});assert.deepEqual(parsed.characters,['藍寶','桃寶']);assert.deepEqual(parsed.situations,['上課','問候']);
 assert.doesNotThrow(()=>tags.validate({lineProducts:[{catalogTags:parsed}]}));assert.throws(()=>tags.validate({gallery:[{catalogTags:{...parsed,characters:Array(13).fill('角色')}}]}),/標籤/);assert.throws(()=>tags.validate({lineProducts:[{catalogTags:{...parsed,topic:'javascript:alert(1)'}}]}),/主題/);
});

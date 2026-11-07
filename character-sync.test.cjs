const {test}=require('node:test');
const assert=require('node:assert/strict');
const cms=require('./github-cms.js');
const revision='20261105-partners-v1';
const old={id:'boy',name:'藍寶',description:'舊介紹',image:'assets/tutu-boy.webp'};
const aunt={id:'yuanyuan',name:'圓圓姨',image:'assets/works/yuanyuan-aunt-20261105.png',published:true};
const teacher={id:'tutu-teacher',name:'塗塗老師',image:'assets/works/tutu-teacher-20261105.png',published:true};
const published=()=>({settings:{brand:'塗塗'},gallery:[],news:[],characters:[old,aunt,teacher],characterRevision:revision});
const teacherRelease=()=>({...published(),characterRevision:'20261105-teacher-v2',mediaLibrary:[{image:teacher.image,name:'塗塗老師｜人物角色',category:'人物夥伴'}]});
test('principal and returning friends reach older drafts once without replacing edits or other removed characters',()=>{
 const principal={id:'malan-principal',name:'瑪藍校長',image:'assets/works/malan-principal-20261108.png'},boy={id:'youyou',name:'佑佑',image:'assets/youyou.webp'},girl={id:'nuannuan',name:'暖暖',image:'assets/nuannuan.webp'};
 const remote={...teacherRelease(),characters:[old,aunt,teacher,principal,boy,girl],characterRevision:'20261108-principal-friends-v1',mediaLibrary:[principal,boy,girl].map(c=>({image:c.image,name:c.name,category:'人物夥伴'}))};
 const custom={...boy,name:'我的佑佑',published:false},local={...teacherRelease(),characters:[old,custom],news:[{id:'unfinished'}],mediaLibrary:[{image:boy.image,name:'保留素材名',deleted:true}]};
 const result=cms.hydrateDraft(local,remote);
 assert.deepEqual(result.characters.map(c=>c.id),['boy','youyou','malan-principal','nuannuan']);
 assert.deepEqual(result.characters[1],custom);assert.deepEqual(result.news,local.news);
 assert.equal(result.mediaLibrary[0].name,'保留素材名');assert.equal(result.mediaLibrary[0].deleted,true);
 assert.equal(result.mediaLibrary.filter(x=>x.image===principal.image).length,1);
 result.characters=result.characters.filter(c=>c.id!=='malan-principal');
 assert.deepEqual(cms.hydrateDraft(result,remote),result);
});
test('teacher release reaches drafts from the prior release without restoring other removed partners',()=>{
 const local={...published(),characters:[{...old,name:'草稿藍寶'}],mediaLibrary:[],news:[{id:'draft'}]};
 const result=cms.hydrateDraft(local,teacherRelease());
 assert.deepEqual(result.characters.map(c=>c.id),['boy','tutu-teacher']);
 assert.equal(result.characters[0].name,'草稿藍寶');assert.deepEqual(result.news,local.news);
 assert.deepEqual(result.mediaLibrary,teacherRelease().mediaLibrary);assert.equal(local.characters.length,1);
 result.characters.pop();result.mediaLibrary=[];
 assert.deepEqual(cms.hydrateDraft(result,teacherRelease()),result);
});
test('teacher release preserves an edited teacher and existing media metadata',()=>{
 const local={...published(),characters:[{...teacher,name:'自訂老師',published:false}],mediaLibrary:[{image:teacher.image,name:'自訂素材',deleted:true}]};
 const result=cms.hydrateDraft(local,teacherRelease());
 assert.deepEqual(result.characters,local.characters);assert.deepEqual(result.mediaLibrary,local.mediaLibrary);
 assert.equal(result.characterRevision,'20261105-teacher-v2');
});
test('teacher release respects empty collections and fills missing legacy collections',()=>{
 const local={...published(),characters:[]};
 assert.deepEqual(cms.hydrateDraft(local,teacherRelease()).characters,[]);
 delete local.characters;
 assert.deepEqual(cms.hydrateDraft(local,teacherRelease()).characters,teacherRelease().characters);
});
test('legacy drafts gain the two new partners while preserving local edits, order and removals',()=>{
 const local={...published(),characters:[{...old,name:'我的藍寶',published:false},{id:'custom',name:'我的角色'}],news:[{id:'draft',title:'未發布公告'}]};delete local.characterRevision;
 const original=structuredClone(local),result=cms.hydrateDraft(local,published());
 assert.deepEqual(result.characters.map(c=>c.id),['boy','custom','yuanyuan','tutu-teacher']);
 assert.equal(result.characters[0].name,'我的藍寶');assert.equal(result.characters[0].published,false);
 assert.deepEqual(result.news,local.news);assert.equal(result.characterRevision,revision);assert.deepEqual(local,original);
 result.characters[2].name='編輯後的姨姨';assert.equal(published().characters[1].name,'圓圓姨');
});
test('already added partners keep their edited profiles and hidden state',()=>{
 const local={...published(),characters:[{...aunt,name:'圓圓姨新名字',published:false}]};delete local.characterRevision;
 const result=cms.hydrateDraft(local,published());
 assert.deepEqual(result.characters.map(c=>c.id),['yuanyuan','tutu-teacher']);
 assert.equal(result.characters[0].name,'圓圓姨新名字');assert.equal(result.characters[0].published,false);
});
test('intentional empty collections and later partner deletions remain deleted',()=>{
 const local={...published(),characters:[]};delete local.characterRevision;
 assert.deepEqual(cms.hydrateDraft(local,published()).characters,[]);
 const upgraded=cms.hydrateDraft({...local,characters:[old]},published());upgraded.characters=upgraded.characters.filter(c=>c.id!=='yuanyuan');
 assert.deepEqual(cms.hydrateDraft(upgraded,published()).characters.map(c=>c.id),['boy','tutu-teacher']);
});
test('drafts predating character collections receive the current published characters',()=>{
 const local={settings:{brand:'草稿'},gallery:[],news:[]};
 const result=cms.hydrateDraft(local,published());assert.deepEqual(result.characters,published().characters);assert.equal(result.settings.brand,'草稿');
 assert.equal(cms.hydrateDraft(null,published()),null);
 const unrelated={...published()};delete unrelated.characterRevision;
 assert.deepEqual(cms.hydrateDraft(local,unrelated),local);
});

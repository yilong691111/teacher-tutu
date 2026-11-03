const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),review=require('./publish-review.js');
async function harness(){
 const nodes=new Map(),events={},rendered=new Map(),submissions=[],base={settings:{},gallery:[],news:[],festivals:[],characters:[],reports:[],lineProducts:[]};
 const el=selector=>{if(!nodes.has(selector))nodes.set(selector,{id:selector,textContent:'',hidden:false,disabled:false,value:'',handlers:{},dataset:{},classList:{toggle(){}},setAttribute(){},removeAttribute(){},addEventListener(k,f){this.handlers[k]=f},showModal(){this.open=true},close(){this.open=false}});return nodes.get(selector);};
 class Client{connected=true;async loadSnapshot(){return {data:structuredClone(base),baseBlob:'original'}}async publish(data,blob){submissions.push({data:structuredClone(data),blob});return {baseBlob:'new',commit:'commit'}}async deployment(){return {state:'succeeded'}}}
 const window={TutuGitHub:{Client,FESTIVAL_DEFAULTS:{},REPO_URL:'https://github.com/yilong691111/teacher-tutu',resolveDraft:(local,snapshot)=>({data:structuredClone(snapshot.data),baseBlob:snapshot.baseBlob}),validateData(){}},TutuPublishReview:{...review,render(doc,container,changes){rendered.set(container.id,structuredClone(changes))}},TutuFestivals:require('./festival-model.js'),TutuContent:require('./content-models.js'),TutuReports:require('./report-model.js'),TutuFormDrafts:{hasPending:()=>false,flush(){}},addEventListener:(k,f)=>events[k]=f,dispatchEvent(){}};
 const context={window,site:structuredClone(base),document:{querySelectorAll:()=>[]},$:el,$$:()=>[],localStorage:{getItem:()=>null,setItem(){},removeItem(){}},structuredClone,loadLocal:()=>null,draftStore:{read:()=>null},draftBaseBlob:null,saveLocal:()=>{events['tutu:draft']?.({detail:{saved:true}});return true},render(){},showPage(){},toast(){},confirm:()=>true,setTimeout:()=>0,clearTimeout(){},CustomEvent:class{}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/admin-publish.js','utf8'),context);await new Promise(r=>setImmediate(r));return {el,events,context,rendered,submissions};
}
test('發布頁與確認視窗使用最新已儲存差異，提交的是確認時看到的內容',async()=>{
 const h=await harness();assert.deepEqual(h.rendered.get('#publish-change-details'),[]);
 h.context.site.news=[{id:'n1',title:'已核對公告',body:'公告正文',published:true}];h.events['tutu:draft']({detail:{saved:true}});
 assert.equal(h.rendered.get('#publish-change-details')[0].title,'已核對公告');h.el('#github-publish').onclick();assert.equal(h.el('#publish-confirm').open,true);assert.equal(h.rendered.get('#publish-confirm-changes')[0].title,'已核對公告');
 h.context.site.news[0].title='確認後其它來源的更新';h.el('#publish-confirm-go').onclick();await new Promise(r=>setImmediate(r));assert.equal(h.submissions.length,1);assert.equal(h.submissions[0].data.news[0].title,'已核對公告');assert.equal(h.submissions[0].blob,'original');
 assert.ok(h.rendered.get('#publish-change-details').some(c=>c.fields.some(f=>f.after==='確認後其它來源的更新')));
});
test('取消確認不送出內容，表單尚未儲存也不能開啟發布確認',async()=>{
 const h=await harness();h.context.site.news=[{id:'n1',title:'新公告'}];h.events['tutu:draft']({detail:{saved:true}});h.el('#github-publish').onclick();h.el('#publish-confirm-cancel').onclick();h.el('#publish-confirm-go').onclick();assert.equal(h.submissions.length,0);
 h.context.window.TutuFormDrafts.hasPending=()=>true;h.el('#github-publish').onclick();assert.equal(h.el('#publish-confirm').open,false);assert.match(h.el('#github-progress').textContent,/未儲存/);
});

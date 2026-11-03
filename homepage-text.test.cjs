const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cms=require('./github-cms.js');
const site=()=>JSON.parse(fs.readFileSync(__dirname+'/data/site.json','utf8'));
test('首頁文字顏色與字體大小在發布前驗證',()=>{
 for(const patch of [{heroTitleColor:'red;display:none'},{heroTitleSize:0},{heroDescriptionSize:1000},{heroTitle:'x'.repeat(161)},{heroKickerColor:'url(x)'},{heroTitleSize:'63'},{heroHighlightColor:null}]){
  const data=site();Object.assign(data.settings,patch);assert.throws(()=>cms.validateData(data),/首頁/);
 }
});
test('舊網站資料不需新增欄位也可以發布',()=>{assert.doesNotThrow(()=>cms.validateData(site()));});
test('自訂首頁文字與樣式可完整匯出再匯入',()=>{
 const data=site();Object.assign(data.settings,{heroTitle:'每天一起開心\n一起成長',heroHighlight:'開心',heroTitleColor:'#123456',heroHighlightColor:'#ff3388',heroTitleSize:60,heroDescriptionColor:'#334455',heroDescriptionSize:18,heroKicker:'WELCOME',heroKickerColor:'#223344',heroKickerSize:14});
 assert.deepEqual(cms.parseData(cms.serializeData(data)).settings,data.settings);
});
test('表單恢復保留首頁文字與樣式，不保留額外資料',()=>{
 const api=require('./form-drafts.js');
 const values=api.sanitize('settings-form',{'settings-heroTitle':'一起開心','settings-heroTitleColor':'#123456','settings-heroTitleSize':'60','settings-heroDescriptionColor':'#334455','settings-heroDescriptionSize':'18',token:'secret'});
 assert.equal(values['settings-heroTitle'],'一起開心');assert.equal(values['settings-heroTitleSize'],'60');assert.equal(values.token,undefined);
});

const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cms=require('./github-cms.js');
const site=()=>JSON.parse(fs.readFileSync(__dirname+'/data/site.json','utf8'));
test('首頁文字顏色與字體大小在發布前驗證',()=>{
 for(const patch of [{heroTitleColor:'red;display:none'},{heroTitleSize:0},{heroDescriptionSize:1000},{heroIntroTitle:'x'.repeat(161)},{heroKickerColor:'url(x)'},{heroTitleSize:'63'},{heroHighlightColor:null}]){
  const data=site();Object.assign(data.settings,patch);assert.throws(()=>cms.validateData(data),/首頁/);
 }
});
test('舊網站資料不需新增欄位也可以發布',()=>{assert.doesNotThrow(()=>cms.validateData(site()));});
test('自訂首頁文字與樣式可完整匯出再匯入',()=>{
 const data=site();Object.assign(data.settings,{heroIntroTitle:'每天一起開心\n一起成長',heroHighlight:'開心',heroTitleColor:'#123456',heroHighlightColor:'#ff3388',heroTitleSize:60,heroDescriptionColor:'#334455',heroDescriptionSize:18,heroKicker:'WELCOME',heroKickerColor:'#223344',heroKickerSize:14});
 assert.deepEqual(cms.parseData(cms.serializeData(data)).settings,data.settings);
});
test('未曾顯示的舊標題不應因啟用編輯功能而取代首頁原文',()=>{
 const model=require('./homepage-text.js');assert.equal(model.values({heroTitle:'舊資料未使用的標題'}).heroTitle,model.defaults.heroTitle);
 assert.equal(model.values({heroIntroTitle:'新編輯的標題'}).heroTitle,'新編輯的標題');
});
test('首頁表單只恢復介紹內文與圖片，不恢復其他編輯選項',()=>{
 const api=require('./form-drafts.js');
 const values=api.sanitize('settings-form',{'settings-heroDescription':'介紹一','settings-heroImage':'assets/tutu-hero.webp','settings-brand':'不要改','settings-heroTitle':'不要改','settings-heroTitleSize':'60',token:'secret'});
 assert.equal(values['settings-heroDescription'],'介紹一');assert.equal(values['settings-heroImage'],'assets/tutu-hero.webp');assert.equal(values['settings-brand'],undefined);assert.equal(values['settings-heroTitle'],undefined);assert.equal(values.token,undefined);
});
test('第二與第三張各自驗證文字和樣式',()=>{
 for(const patch of [{hero2Title:''},{hero2TitleSize:1000},{hero2TitleColor:'invalid'},{hero3Description:'x'.repeat(1001)},{hero3DescriptionSize:'18'},{hero3HighlightColor:null}]){
  const data=site();Object.assign(data.settings,patch);assert.throws(()=>cms.validateData(data),/首頁/);
 }
});
test('三張輪播互不覆蓋，舊資料保留原始第二三張介紹',()=>{
 const model=require('./homepage-text.js');
 assert.equal(model.values({},2).heroTitle,'歪歪的線條，\n獨一無二的塗塗。');
 assert.equal(model.values({},3).heroTitle,'塗塗的日常，\n一起說祝福。');
 const data={heroIntroTitle:'第一張',heroTitleSize:60,hero2Title:'第二張',hero2TitleColor:'#123456',hero3Title:'第三張',hero3DescriptionSize:20};
 assert.equal(model.values(data,1).heroTitle,'第一張');assert.equal(model.values(data,2).heroTitle,'第二張');assert.equal(model.values(data,3).heroTitle,'第三張');
 assert.equal(model.values(data,2).heroTitleColor,'#123456');assert.equal(model.values(data,3).heroDescriptionSize,20);assert.equal(model.values(data,1).heroDescriptionSize,16);
});
test('第二三張表單資料可恢復，完整資料可匯出再匯入',()=>{
 const api=require('./form-drafts.js'),values=api.sanitize('settings-form',{'settings-hero2Description':'介紹二','settings-hero2Image':'assets/tutu-original.webp','settings-hero3Description':'介紹三','settings-hero3Image':'assets/works/002.webp'});
 assert.equal(values['settings-hero2Description'],'介紹二');assert.equal(values['settings-hero3Description'],'介紹三');assert.equal(values['settings-hero3Image'],'assets/works/002.webp');
 const data=site();Object.assign(data.settings,{hero2Title:'第二張',hero2Description:'介紹二',hero2TitleSize:50,hero3Title:'第三張',hero3Description:'介紹三',hero3KickerColor:'#123456'});
 assert.deepEqual(cms.parseData(cms.serializeData(data)).settings,data.settings);
});
test('三張首頁圖片都驗證安全格式並標示素材使用位置',()=>{
 for(const key of ['heroIntroImage','hero2Image','hero3Image']){const data=site();data.settings[key]='https://invalid.test/picture.svg';assert.throws(()=>cms.validateData(data),/首頁/);}
 const media=require('./media-model.js'),data=site();data.settings.hero2Image='data:image/png;base64,AAAA';
 const record=media.catalog(data).find(x=>x.image===data.settings.hero2Image);assert.ok(record.uses.some(x=>x.label.includes('首頁介紹 2')));
});
test('首頁儲存只讀取內文和圖片，保留原有標題、品牌與樣式',()=>{
 const model=require('./homepage-text.js'),fields={'settings-heroDescription':{value:'介紹一'},'settings-heroImage':{value:'assets/tutu-hero.webp'},'settings-hero2Description':{value:'介紹二'},'settings-hero2Image':{value:'assets/tutu-original.webp'},'settings-hero3Description':{value:'介紹三'},'settings-hero3Image':{value:'assets/works/002.webp'}};
 const next=model.read({getElementById:id=>fields[id]||null});assert.equal(next.heroDescription,'介紹一');assert.equal(next.heroIntroImage,'assets/tutu-hero.webp');assert.equal(next.hero3Description,'介紹三');assert.equal(next.heroIntroTitle,undefined);assert.equal(next.brand,undefined);assert.equal(next.heroTitleSize,undefined);
});

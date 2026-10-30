/* Editable reports, legacy fallback and validation shared by admin and public pages. */
(function(root,factory){const content=typeof module==='object'&&module.exports?require('./content-models.js'):root.TutuContent;const api=factory(content);if(typeof module==='object'&&module.exports)module.exports=api;else root.TutuReports=api;})(typeof window==='undefined'?globalThis:window,function(content){
 'use strict';
 const legacy={
  "id": "grade7-idioms",
  "label": "七年級成語篇 1–5",
  "subtitle": "12年國教七年級常用成語",
  "title": "聊天有梗，成語也有戲。",
  "summary": "讓孩子在聊天過程中，就能活用成語。",
  "body": "把書本裡看過的詞語，放進每天想說的話。從「循序漸進」的鼓勵，到「相親相愛」的心意，跟著塗塗的蠟筆表情，讓成語多一個走進日常的機會。",
  "sections": [
    {
      "label": "給家長",
      "title": "讓學過的詞，多一次被想起。",
      "body": "成語不必只出現在課本與考卷裡。孩子想替朋友加油、送出一句祝福，或表達當下的心情時，都可以試著找一張貼切的貼圖。您也能順著問一句：「為什麼這裡適合用這個成語？」讓一句聊天，成為親子分享詞義與情境的小起點。"
    },
    {
      "label": "給老師",
      "title": "多一個讓學生願意開口的引子。",
      "body": "上課前選一張貼圖，請學生猜意思、找情境、接一句話；下課前，再用一句造句收尾。也可以把「這張貼圖適合傳給誰？」當成討論題，讓學生比較不同用法。把熟悉的聊天語言，接回課堂裡的表達練習，讓成語教學多一個有趣的開場。"
    },
    {
      "label": "給學生",
      "title": "回得有梗，也回出你的風格。",
      "body": "替朋友加油，想回得更有自己的風格；看到有趣的事，也想用一張貼圖接住心情。讓塗塗替聊天加點戲！可愛的蠟筆角色搭配成語表達，回覆可以有梗，也能有意思。挑選最喜歡的一輯，把熟悉的成語變成你的聊天風格。"
    }
  ],
  "closing": "挑一輯喜歡的塗塗，讓下一次聊天多一點詞彙，也多一點你的風格。",
  "buttonText": "挑選我的成語貼圖 ↓",
  "buttonLink": "?topic=idioms#line-catalog",
  "published": true
};
 const reportsFor=site=>site.reports===undefined?[JSON.parse(JSON.stringify(legacy))]:site.reports;
 const anchor=report=>report.id==='grade7-idioms'?'grade7-idioms':'report-'+report.id;
 const safeLink=value=>value==='?topic=idioms#line-catalog'||content.safeLink(value);
 function text(item,key,max,required=false){const value=item[key];if(value===undefined&&!required)return;if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw new Error('特別報導'+key+'不可空白或超過字數限制。');}
 function validateReport(r){
  if(!r||typeof r.id!=='string'||!/^[\w-]{1,80}$/.test(r.id))throw new Error('特別報導識別碼不正確。');
  text(r,'title',150,true);text(r,'body',30000,true);
  for(const [key,max] of [['label',80],['subtitle',150],['summary',1500],['closing',1500],['buttonText',80],['buttonLink',2000]])text(r,key,max);
  if(r.published!==undefined&&typeof r.published!=='boolean')throw new Error('特別報導展示狀態不正確。');
  if(r.sections!==undefined){if(!Array.isArray(r.sections)||r.sections.length>3)throw new Error('特別報導補充段落最多三段。');for(const section of r.sections){if(!section||typeof section!=='object'||Array.isArray(section))throw new Error('特別報導補充段落格式不正確。');text(section,'label',80);text(section,'title',150,true);text(section,'body',5000,true);}}
  if(Boolean(r.buttonText?.trim())!==Boolean(r.buttonLink?.trim())||(r.buttonLink&&!safeLink(r.buttonLink)))throw new Error('特別報導按鈕文字與安全連結請一起填寫，或一起留空。');
 }
 function validate(site){if(site.reports===undefined)return site;if(!Array.isArray(site.reports))throw new Error('特別報導資料必須是清單。');const ids=new Set();for(const report of site.reports){validateReport(report);if(ids.has(report.id))throw new Error('特別報導識別碼重複。');ids.add(report.id);}return site;}
 function save(list,originalId,fields){const index=originalId?list.findIndex(r=>r.id===originalId):-1;if(originalId&&index<0)throw new Error('特別報導已不存在，請重新開啟。');if(originalId&&fields.id!==originalId)throw new Error('特別報導識別碼不可更換。');if(list.some((r,i)=>r.id===fields.id&&i!==index))throw new Error('特別報導識別碼重複。');const report={...(list[index]||{}),...fields};validateReport(report);const next=list.slice();if(index<0)next.unshift(report);else next[index]=report;return next;}
 return {reportsFor,anchor,safeLink,validate,save};
});

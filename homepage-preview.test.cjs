const {test}=require('node:test'),assert=require('node:assert/strict');
test('未儲存的首頁第二篇與品牌短句可產生預覽訊息而不更改草稿',()=>{
 const preview=require('./homepage-preview.js'),draft={settings:{homepageTagline:'原短句',hero2Description:'原文'}},before=structuredClone(draft),message=preview.message({...draft.settings,homepageTagline:'新短句',hero2Description:'尚未儲存'},2,'preview-123');
 assert.equal(message.slide,2);assert.equal(message.settings.hero2Description,'尚未儲存');assert.deepEqual(draft,before);assert.equal(preview.slideForTarget('homepage-editor-3',1),3);assert.equal(preview.slideForTarget('settings-tagline',2),2);
});
test('嵌入預覽只接受同來源、指定父頁與同一個預覽識別碼',()=>{
 const preview=require('./homepage-preview.js'),parent={},seen=[],receive=preview.receiver({origin:'https://example.test',parent,token:'preview-123',apply:(settings,slide)=>seen.push({settings,slide})}),data=preview.message({homepageTagline:'即時短句'},2,'preview-123');
 for(const event of [{origin:'https://evil.test',source:parent,data},{origin:'https://example.test',source:{},data},{origin:'https://example.test',source:parent,data:{...data,token:'other'}}])assert.equal(receive(event),false);
 assert.equal(receive({origin:'https://example.test',source:parent,data}),true);assert.equal(seen[0].slide,2);assert.equal(seen[0].settings.homepageTagline,'即時短句');
 assert.equal(receive({origin:'https://example.test',source:parent,data:{...data,slide:99}}),false);
});
test('預覽網址帶入指定篇數與版本，拒絕無效篇數及未通過驗證的特效連結',()=>{
 const preview=require('./homepage-preview.js'),url=new URL(preview.url(3,'preview-123'),'https://example.test');assert.equal(url.searchParams.get('slide'),'3');assert.equal(url.searchParams.get('editorPreview'),'preview-123');assert.ok(url.searchParams.get('v'));
 assert.throws(()=>preview.url(4,'preview-123'));assert.throws(()=>preview.message({heroTextBlocks:[{text:'test',fontSize:16,effect:'none',underline:'none',background:'transparent',linkText:'link',url:'javascript:alert(1)'}]},1,'preview-123'));
});

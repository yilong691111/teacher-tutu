const {test}=require('node:test'),assert=require('node:assert/strict');const editor=(()=>{try{return require('./media-editor.js')}catch{return {}}})();
function doc(){const fields=new Map();return {fields,getElementById(id){if(!fields.has(id))fields.set(id,{id,value:'',files:['old-file'],hidden:false,src:'old',events:[],dispatchEvent(event){this.events.push(event.type);return true;}});return fields.get(id);}};}
test('library selection copies only image fields, clears upload/gallery provenance and emits the existing input event',()=>{
 const d=doc();d.getElementById('festival-title').value='保留文字';d.getElementById('festival-work-ids').value='a,b';d.getElementById('festival-cover-work-id').value='a';d.getElementById('festival-image-alt').value='自訂說明';
 assert.equal(typeof editor.applyImage,'function');editor.applyImage(d,'festival',{image:'assets/works/new.png',name:'新圖',alt:'素材說明'});
 assert.equal(d.getElementById('festival-current-image').value,'assets/works/new.png');assert.equal(d.getElementById('festival-image-preview').src,'assets/works/new.png');assert.equal(d.getElementById('festival-file').value,'');assert.equal(d.getElementById('festival-cover-work-id').value,'');assert.equal(d.getElementById('festival-gallery-image').value,'');assert.equal(d.getElementById('festival-title').value,'保留文字');assert.equal(d.getElementById('festival-work-ids').value,'a,b');assert.equal(d.getElementById('festival-image-alt').value,'自訂說明');assert.deepEqual(d.getElementById('festival-current-image').events,['input']);
});
test('all four editors accept safe library images and fill missing accessible description without changing titles',()=>{
 for(const [prefix,value] of [['work','work-existing-image'],['line-product','line-product-existing-image'],['character','character-existing-image'],['festival','festival-current-image']]){const d=doc();editor.applyImage(d,prefix,{image:'data:image/png;base64,AAAA',name:'素材名稱',alt:'圖片說明'});assert.equal(d.getElementById(value).value,'data:image/png;base64,AAAA');assert.equal(d.getElementById(prefix+'-image-error').value,'');if(['character','festival'].includes(prefix))assert.equal(d.getElementById(prefix+'-image-alt').value,'圖片說明');}
});
test('unsafe image or unsupported target cannot mutate any field',()=>{
 const d=doc();assert.throws(()=>editor.applyImage(d,'unknown',{image:'assets/works/a.png'}));assert.equal(d.fields.size,0);assert.throws(()=>editor.applyImage(d,'work',{image:'javascript:alert(1)'}));assert.equal(d.fields.size,0);
});
test('uploaded image download uses decoded binary with the right MIME type instead of data navigation',async()=>{
 assert.equal(typeof editor.downloadBlob,'function');const blob=editor.downloadBlob('data:image/webp;base64,AAAA');assert.equal(blob.type,'image/webp');assert.deepEqual([...new Uint8Array(await blob.arrayBuffer())],[0,0,0]);assert.equal(editor.downloadBlob('assets/works/a.png'),null);assert.throws(()=>editor.downloadBlob('https://evil.example/a.png'));
});

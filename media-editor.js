/* Apply a library selection to an unfinished editor, never to public site data. */
(function(root,factory){const node=typeof module==='object'&&module.exports;const api=factory(node?require('./content-models.js'):root.TutuContent);if(node)module.exports=api;else root.TutuMediaEditor=api;})(typeof window==='undefined'?globalThis:window,function(content){
 'use strict';
 const targets={work:'work-existing-image','line-product':'line-product-existing-image',character:'character-existing-image',festival:'festival-current-image'};
 function applyImage(doc,prefix,asset){
  if(!Object.hasOwn(targets,prefix)||!asset||!content.safeImage(asset.image))throw new Error('素材圖片或編輯目標不正確。');
  const value=doc.getElementById(targets[prefix]),file=doc.getElementById(prefix+'-file'),preview=doc.getElementById(prefix+'-image-preview');
  file.value='';value.value=asset.image;preview.src=asset.image;preview.hidden=false;
  const gallery=doc.getElementById(prefix+'-gallery-image');if(gallery)gallery.value='';
  const provenance=prefix==='festival'?doc.getElementById('festival-cover-work-id'):null;if(provenance)provenance.value='';
  const error=doc.getElementById(prefix+'-image-error');if(error)error.value='';
  if(['character','festival'].includes(prefix)){const alt=doc.getElementById(prefix+'-image-alt');if(alt&&!alt.value.trim())alt.value=(asset.alt||asset.name||'素材圖片').slice(0,200);}
  value.dispatchEvent(new Event('input',{bubbles:true}));
 }
 function downloadBlob(image){if(!content.safeImage(image))throw new Error('素材圖片不正確。');if(!image.startsWith('data:'))return null;const mime=image.slice(5,image.indexOf(';')),bytes=Uint8Array.from(atob(image.split(',')[1].replace(/\s/g,'')),c=>c.charCodeAt(0));return new Blob([bytes],{type:mime});}
 return {applyImage,downloadBlob};
});

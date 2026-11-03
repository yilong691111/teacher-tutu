/* Unfinished homepage preview messages; never writes a saved draft. */
(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(node?require('./homepage-text.js'):root.TutuHomepageText);if(node)module.exports=api;else root.TutuHomepagePreview=api;})(typeof window==='undefined'?globalThis:window,function(home){
 'use strict';
 const validSlide=slide=>Number.isInteger(slide)&&slide>=1&&slide<=3;
 const validToken=token=>typeof token==='string'&&/^[\w-]{8,100}$/.test(token);
 function message(settings,slide,token){if(!validSlide(slide)||!validToken(token))throw new Error('首頁預覽設定不正確。');home.validate(settings);return {type:'tutu:homepage-preview',token,slide,settings:structuredClone(settings)};}
 function url(slide,token){if(!validSlide(slide)||!validToken(token))throw new Error('首頁預覽設定不正確。');return 'index.html?draft=1&v=20261103-preview-assets-tags&editorPreview='+encodeURIComponent(token)+'&slide='+slide+'#top';}
 function receiver({origin,parent,token,apply}){return event=>{if(event.origin!==origin||event.source!==parent||!event.data||event.data.type!=='tutu:homepage-preview'||event.data.token!==token)return false;try{const next=message(event.data.settings,event.data.slide,token);apply(next.settings,next.slide);return true;}catch{return false;}};}
 const slideForTarget=(id,current)=>{const match=/^homepage-editor(?:-([23]))?$/.exec(id);return match?Number(match[1]||1):current;};
 return {message,url,receiver,slideForTarget};
});

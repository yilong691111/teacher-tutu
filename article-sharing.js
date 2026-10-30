/* User-activated article sharing, with clipboard and manual-copy fallbacks. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TutuArticleSharing=api;})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 function mount(article,options={}){
  const doc=options.document||document,nav=options.navigator||navigator,$=id=>doc.getElementById(id);
  const share=$('share-report'),copy=$('copy-report-link'),status=$('report-share-status'),fallback=$('report-share-fallback'),input=$('report-share-url');
  if(!share||!copy||!status||!fallback||!input)return;
  const data={title:article.title,text:article.text,url:article.url};let busy=false;
  const announce=message=>{status.textContent=message;status.hidden=!message;};
  const lock=value=>{busy=value;share.disabled=value;copy.disabled=value;};
  async function copyLink(){
   if(typeof nav.clipboard?.writeText==='function'){
    try{await nav.clipboard.writeText(data.url);announce('文章連結已複製，可以貼給朋友分享。');return false;}catch{}
   }
   fallback.hidden=false;input.value=data.url;input.focus();input.select();announce('無法自動複製，請手動複製下方文章連結。');return true;
  }
  async function run(mode,button){
   if(busy)return;lock(true);announce('');fallback.hidden=true;let manual=false;
   try{
    if(mode==='share'&&typeof nav.share==='function'){
     try{await nav.share({...data});announce('分享操作已完成。');return;}
     catch(error){if(error?.name==='AbortError'){announce('已取消分享。');return;}}
    }
    manual=await copyLink();
   }finally{lock(false);if(!manual)button.focus({preventScroll:true});}
  }
  share.onclick=()=>run('share',share);copy.onclick=()=>run('copy',copy);
 }
 return {mount};
});

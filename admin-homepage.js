/* Homepage uploads update only the unfinished description/image form. */
(function(){
 'use strict';
 const model=window.TutuHomepageText;if(!model||!$('#settings-form'))return;
 for(const slide of [1,2,3]){
  const prefix='homepage-'+slide,field=$('#settings-'+(slide===1?'hero':'hero'+slide)+'Image'),file=$('#'+prefix+'-file'),select=$('#'+prefix+'-media'),status=$('#'+prefix+'-status');
  function apply(image){
   if(!window.TutuContent.safeImage(image))throw new Error('圖片格式不正確。');
   field.value=image;field.dispatchEvent(new Event('input',{bubbles:true}));model.preview(document);
  }
  file.addEventListener('change',async()=>{
   const imageFile=file.files[0];if(!imageFile)return;let release=()=>{};
   try{
    checkFestivalFile(imageFile);release=beginEditorSave('settings-form');status.textContent='正在處理圖片，請稍候…';
    const image=await compressImage(imageFile);apply(image);select.value='';status.textContent='圖片已帶入，請儲存首頁介紹。';
   }catch(err){status.textContent='換圖未完成，原圖片已保留。';toast(err.message,true);}
   finally{file.value='';release();}
  });
  select.addEventListener('change',()=>{
   if(!select.value)return;
   try{apply(select.value);file.value='';status.textContent='素材已帶入，請儲存首頁介紹。';}catch(err){toast(err.message,true);}
  });
  $('#'+prefix+'-reset').onclick=()=>{apply(model.values(site.settings,slide).heroImage);file.value='';select.value='';status.textContent='已恢復目前儲存的圖片。';};
 }
})();

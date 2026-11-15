import {createHandler} from './handler.mjs';
const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
async function rpc(name:string,payload:object={}){
 const result=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(7000)});
 if(!result.ok)throw Error('Statistics storage unavailable');
 return result.json();
}
let books:any[]=[],expires=0;
async function loadBooks(){
 if(Date.now()<expires)return books;
 const result=await fetch('https://yilong691111.github.io/teacher-tutu/data/site.json',{cache:'no-store',signal:AbortSignal.timeout(7000)});
 if(!result.ok)throw Error('Catalog unavailable');
 const catalog=await result.json();if(!Array.isArray(catalog.coloringBooks))throw Error('Catalog invalid');
 books=catalog.coloringBooks;expires=Date.now()+60000;return books;
}
Deno.serve(createHandler({snapshot:()=>rpc('tutu_statistics'),loadBooks,record:({kind,visitorHash,bookId,eventId})=>rpc('tutu_record_event',{p_kind:kind,p_visitor_hash:visitorHash,p_book_id:bookId,p_event_id:eventId})}));

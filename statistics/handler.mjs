const ORIGIN='https://yilong691111.github.io';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function createHandler({snapshot,record,loadBooks}){
 return async function handle(request){
  const origin=request.headers.get('origin');
  const headers={'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','Vary':'Origin'};
  if(origin===ORIGIN)Object.assign(headers,{'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Max-Age':'3600'});
  const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
  if(origin&&origin!==ORIGIN)return reply({error:'Origin not allowed'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  try{
   if(request.method==='GET')return reply(await snapshot());
   if(request.method!=='POST')return reply({error:'Method not allowed'},405);
   if(origin!==ORIGIN)return reply({error:'Origin required'},403);
   if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'JSON required'},415);
   const text=await request.text();if(text.length>1024)return reply({error:'Event too large'},413);
   let body;try{body=JSON.parse(text)}catch{return reply({error:'Invalid JSON'},400)}
   if(!body||!UUID.test(body.visitorId)||!['visit','download'].includes(body.event))return reply({error:'Invalid event'},400);
   if(body.event==='download'){
    if(!UUID.test(body.eventId)||typeof body.bookId!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(body.bookId))return reply({error:'Invalid download'},400);
    const books=await loadBooks();
    if(!books.some(b=>b.id===body.bookId&&b.published!==false&&b.pdf===body.pdf))return reply({error:'Book not published'},400);
   }
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('teacher-tutu:'+body.visitorId));
   const visitorHash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
   return reply(await record({kind:body.event,visitorHash,bookId:body.event==='download'?body.bookId:'',eventId:body.event==='download'?body.eventId:null}));
  }catch{return reply({error:'Statistics temporarily unavailable'},503)}
 };
}

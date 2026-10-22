// Deploy as Supabase Edge Function "create-student" with verify_jwt=true.
// Secrets SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase runtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
Deno.serve(async(req)=>{
 const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json'};
 const respond=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(req.method!=='POST')return respond({error:'Method not allowed'},405);
 try{
  const url=Deno.env.get('SUPABASE_URL');const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!key)return respond({error:'Backend not configured'},503);
  const admin=createClient(url,key);
  const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  if(!token)return respond({error:'Not authenticated'},401);
  const {data:{user},error:authError}=await admin.auth.getUser(token);
  if(authError||!user)return respond({error:'Invalid session'},401);
  const {data:operator}=await admin.from('profiles').select('role,active').eq('id',user.id).maybeSingle();
  if(operator?.role!=='admin'||!operator.active)return respond({error:'Admin access required'},403);
  const body=await req.json();const email=String(body.email||'').trim().toLowerCase();const name=String(body.full_name||'').trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||name.length<2||name.length>120)return respond({error:'Informe nome e e-mail válidos'},400);
  const {data,error}=await admin.auth.admin.inviteUserByEmail(email,{data:{full_name:name}});
  if(error)return respond({error:error.message},400);
  const id=data.user.id;
  const {error:profileError}=await admin.from('profiles').upsert({id,full_name:name,role:'student',active:true},{onConflict:'id'});
  if(profileError)return respond({error:'Convite enviado, mas o perfil não foi criado. Verifique no painel.'},500);
  const {error:sheetError}=await admin.from('workout_sheets').upsert({student_id:id,content:'',status:'pending_review'},{onConflict:'student_id',ignoreDuplicates:true});
  if(sheetError)return respond({error:'Aluno criado, mas ficha não inicializada.'},500);
  return respond({ok:true,message:'Convite de acesso enviado por e-mail.'});
 }catch{return respond({error:'Erro ao criar aluno'},500)}
});
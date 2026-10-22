// Admin-only invitation endpoint. Deploy with verify_jwt enabled.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
Deno.serve(async req=>{
 const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json'};
 const respond=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return respond({error:'Method not allowed'},405);
 try{
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!key)return respond({error:'Backend not configured'},503);
  const admin=createClient(url,key);
  const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  if(!token)return respond({error:'Not authenticated'},401);
  const {data:{user},error:authError}=await admin.auth.getUser(token);
  if(authError||!user)return respond({error:'Invalid session'},401);
  const {data:operator}=await admin.from('profiles').select('role,active').eq('id',user.id).maybeSingle();
  if(operator?.role!=='admin'||!operator.active)return respond({error:'Admin access required'},403);
  const body=await req.json();const email=String(body.email||'').trim().toLowerCase();const name=String(body.full_name||'').trim();const role=body.role==='admin'?'admin':body.role==='student'?'student':null;
  if(!role||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||name.length<2||name.length>120)return respond({error:'Informe nome, e-mail e perfil válidos'},400);
  const {data,error}=await admin.auth.admin.inviteUserByEmail(email,{data:{full_name:name}});
  if(error)return respond({error:error.message},400);
  const id=data.user.id;
  const {error:profileError}=await admin.from('profiles').insert({id,full_name:name,role,active:true});
  if(profileError){await admin.auth.admin.deleteUser(id);return respond({error:'Não foi possível criar o perfil; convite cancelado.'},500)}
  if(role==='student'){
   const {error:sheetError}=await admin.from('workout_sheets').insert({student_id:id,content:'',status:'pending_review'});
   if(sheetError)return respond({error:'Aluno criado, mas ficha não inicializada.'},500);
  }
  return respond({ok:true,message:role==='admin'?'Convite de administrador enviado.':'Convite de aluno enviado.'});
 }catch{return respond({error:'Erro ao criar conta'},500)}
});
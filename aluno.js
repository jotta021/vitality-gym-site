import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';
const $=id=>document.getElementById(id),msg=(s)=>$('message').textContent=s;
const configured=SUPABASE_URL.startsWith('https://')&&SUPABASE_ANON_KEY.length>30;
$('setup').hidden=configured;$('login-form').hidden=!configured;
if(configured){
 const db=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
 let session=null,profile=null,selected=null;
 async function load(){
  const {data:{session:s}}=await db.auth.getSession();session=s;
  $('login-form').hidden=!!s;$('dashboard').hidden=!s;
  if(!s)return;
  const {data:p,error}=await db.from('profiles').select('id,full_name,role,active').eq('id',s.user.id).maybeSingle();
  if(error||!p?.active){msg('Acesso não autorizado ou desativado.');await db.auth.signOut();$('login-form').hidden=false;$('dashboard').hidden=true;return}
  profile=p;$('welcome').textContent='OLÁ, '+p.full_name.toUpperCase();
  $('admin-panel').hidden=p.role!=='admin';$('student-panel').hidden=p.role==='admin';
  if(p.role==='admin')await listStudents();
  else{const {data:sheet}=await db.from('workout_sheets').select('content,status').eq('student_id',p.id).maybeSingle();$('sheet-content').value=sheet?.content||'';$('sheet-status').textContent=sheet?.status==='approved'?'Ficha revisada pelo professor':'Ficha pendente de revisão pelo professor'}
 }
 $('login-form').addEventListener('submit',async e=>{e.preventDefault();msg('Entrando...');const {error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});msg(error?'Não foi possível entrar. Confira suas credenciais.':'');if(!error)await load()});
 $('logout').addEventListener('click',async()=>{await db.auth.signOut();profile=null;msg('Sessão encerrada.');await load()});
 $('sheet-form').addEventListener('submit',async e=>{e.preventDefault();if(!profile||profile.role!=='student')return;const {error}=await db.from('workout_sheets').update({content:$('sheet-content').value,status:'pending_review'}).eq('student_id',profile.id);msg(error?'Não foi possível salvar.':'Alterações salvas e enviadas para revisão.');if(!error)$('sheet-status').textContent='Ficha pendente de revisão pelo professor'});
 async function listStudents(){const {data,error}=await db.from('profiles').select('id,full_name,role,active').order('full_name');const list=$('student-list');list.replaceChildren();if(error){msg('Erro ao listar alunos.');return}for(const p of data||[]){const row=document.createElement('div');row.className='student-row';const name=document.createElement('span');name.textContent=p.full_name+' — '+(p.role==='admin'?'Administrador':'Aluno')+(p.active?'':' (desativado)');const button=document.createElement('button');button.textContent='EDITAR FICHA';button.className='btn btn-outline';button.disabled=p.role==='admin';button.addEventListener('click',()=>editStudent(p));row.append(name,button);list.append(row)}}
 async function editStudent(p){selected=p;$('admin-editor').hidden=false;$('editing-name').textContent=p.full_name;const {data,error}=await db.from('workout_sheets').select('content').eq('student_id',p.id).maybeSingle();if(error){msg('Erro ao carregar ficha.');return}$('admin-sheet').value=data?.content||'';$('admin-editor').scrollIntoView({behavior:'smooth'})}
 $('save-admin-sheet').addEventListener('click',async()=>{if(!selected)return;const {error}=await db.from('workout_sheets').upsert({student_id:selected.id,content:$('admin-sheet').value,status:'approved'},{onConflict:'student_id'});msg(error?'Erro ao salvar ficha.':'Ficha salva e aprovada pelo administrador.')});
 $('deactivate-student').addEventListener('click',async()=>{if(!selected||selected.role==='admin'||!confirm('Desativar o acesso deste aluno?'))return;const {error}=await db.from('profiles').update({active:false}).eq('id',selected.id);msg(error?'Erro ao desativar aluno.':'Acesso desativado.');if(!error){$('admin-editor').hidden=true;await listStudents()}});
 $('invite-form').addEventListener('submit',async e=>{e.preventDefault();msg('Enviando convite...');const {data,error}=await db.functions.invoke('create-student',{body:{full_name:$('student-name').value.trim(),email:$('student-email').value.trim(),role:$('account-role').value}});msg(error||data?.error?'Erro ao criar aluno: '+(data?.error||error?.message||'verifique o servidor'):'Convite enviado por e-mail.');if(!error&&!data?.error){e.target.reset();await listStudents()}});
 await load();
}
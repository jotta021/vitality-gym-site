-- Vitality Gym: execute no SQL Editor de um projeto Supabase novo.
create extension if not exists pgcrypto;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null,
 role text not null default 'student' check(role in ('student','admin')),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.workout_sheets (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null unique references public.profiles(id) on delete cascade,
 content text not null default '',
 status text not null default 'pending_review' check(status in ('pending_review','approved')),
 updated_at timestamptz not null default now()
);
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.role='admin' and p.active);
$$;
create or replace function public.is_active() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.active);
$$;
alter table public.profiles enable row level security;
alter table public.workout_sheets enable row level security;
create policy "Profiles visible to owner or admin" on public.profiles for select to authenticated using ((id = (select auth.uid()) and public.is_active()) or public.is_admin());
create policy "Admins manage profiles" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Students and admins read sheets" on public.workout_sheets for select to authenticated using ((student_id = (select auth.uid()) and public.is_active()) or public.is_admin());
create policy "Students update own sheet" on public.workout_sheets for update to authenticated using (student_id = (select auth.uid()) and public.is_active()) with check (student_id = (select auth.uid()) and status='pending_review' and public.is_active());
create policy "Admins manage sheets" on public.workout_sheets for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- Protect role, status and ownership from being changed by students even through API requests.
create or replace function public.guard_workout_updates() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_admin() then
  if new.student_id is distinct from old.student_id or new.status is distinct from 'pending_review' then
   raise exception 'Not allowed';
  end if;
  new.status := 'pending_review';
 end if;
 new.updated_at := now();
 return new;
end $$;
create trigger workout_update_guard before update on public.workout_sheets for each row execute function public.guard_workout_updates();
-- Depois de criar o PRIMEIRO usuário pelo painel Auth do Supabase, promova-o manualmente:
-- insert into public.profiles(id,full_name,role) values ('UUID-DO-ADMIN','Administrador Vitality','admin');
-- IMPORTANTE: desabilite novos cadastros públicos em Authentication > Providers > Email.

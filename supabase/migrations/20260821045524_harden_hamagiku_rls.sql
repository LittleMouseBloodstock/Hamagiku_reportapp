-- Hamagiku / MultilingualReport only.
-- Replace anonymous and unrestricted-authenticated policies with a database-side
-- allowlist check. The preflight block aborts before any change if this is not the
-- expected schema or if no current administrator can be resolved.

do $preflight$
declare
  expected_table text;
  expected_signature text;
begin
  foreach expected_table in array array[
    'allowed_users',
    'clients',
    'domain_knowledge',
    'horses',
    'reports',
    'trainers',
    'horse_weights',
    'knowledge_chunks',
    'report_assets',
    'report_chunks',
    'report_drafts',
    'repro_checks',
    'repro_findings',
    'repro_daily_snapshots',
    'repro_follow_up_tasks',
    'repro_followup_rules',
    'repro_covers',
    'repro_scans',
    'repro_memo_events',
    'translation_rules',
    'translations'
  ] loop
    if to_regclass(format('public.%I', expected_table)) is null then
      raise exception 'Hamagiku RLS preflight failed: missing public.%', expected_table;
    end if;
  end loop;

  if to_regclass('public.workspaces') is not null then
    raise exception 'Hamagiku RLS preflight failed: Shinba workspace schema detected';
  end if;

  foreach expected_signature in array array[
    'public.repro_recompute_follow_up_status()',
    'public.repro_recompute_daily_snapshot(uuid,date)',
    'public.repro_create_check(uuid,timestamp with time zone,text,text,text,jsonb,jsonb,uuid)',
    'public.repro_create_cover(uuid,date,text,text,text)'
  ] loop
    if to_regprocedure(expected_signature) is null then
      raise exception 'Hamagiku RLS preflight failed: missing %', expected_signature;
    end if;
  end loop;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'allowed_users'
      and column_name = 'email'
      and data_type = 'text'
  ) then
    raise exception 'Hamagiku RLS preflight failed: allowed_users.email is missing';
  end if;

  if not exists (
    select 1
    from auth.users as auth_user
    join public.allowed_users as allowed_user
      on lower(allowed_user.email) = lower(auth_user.email)
    where allowed_user.role = 'admin'
  ) then
    raise exception 'Hamagiku RLS preflight failed: no current allowlisted administrator';
  end if;
end;
$preflight$;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
revoke all on schema private from service_role;
grant usage on schema private to authenticated;

create or replace function private.is_hamagiku_allowed_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from auth.users as auth_user
    join public.allowed_users as allowed_user
      on lower(allowed_user.email) = lower(auth_user.email)
    where auth_user.id = (select auth.uid())
  );
$function$;

create or replace function private.is_hamagiku_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from auth.users as auth_user
    join public.allowed_users as allowed_user
      on lower(allowed_user.email) = lower(auth_user.email)
    where auth_user.id = (select auth.uid())
      and allowed_user.role = 'admin'
  );
$function$;

create or replace function private.is_hamagiku_own_allowlist_entry(candidate_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from auth.users as auth_user
    where auth_user.id = (select auth.uid())
      and lower(auth_user.email) = lower(candidate_email)
  );
$function$;

alter function private.is_hamagiku_allowed_user() owner to postgres;
alter function private.is_hamagiku_admin() owner to postgres;
alter function private.is_hamagiku_own_allowlist_entry(text) owner to postgres;

revoke all on function private.is_hamagiku_allowed_user() from public;
revoke all on function private.is_hamagiku_allowed_user() from anon;
revoke all on function private.is_hamagiku_allowed_user() from authenticated;
revoke all on function private.is_hamagiku_allowed_user() from service_role;
grant execute on function private.is_hamagiku_allowed_user() to authenticated;

revoke all on function private.is_hamagiku_admin() from public;
revoke all on function private.is_hamagiku_admin() from anon;
revoke all on function private.is_hamagiku_admin() from authenticated;
revoke all on function private.is_hamagiku_admin() from service_role;
grant execute on function private.is_hamagiku_admin() to authenticated;

revoke all on function private.is_hamagiku_own_allowlist_entry(text) from public;
revoke all on function private.is_hamagiku_own_allowlist_entry(text) from anon;
revoke all on function private.is_hamagiku_own_allowlist_entry(text) from authenticated;
revoke all on function private.is_hamagiku_own_allowlist_entry(text) from service_role;
grant execute on function private.is_hamagiku_own_allowlist_entry(text) to authenticated;

create or replace function private.protect_last_hamagiku_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  removing_admin boolean := false;
begin
  -- Serialize administrator removals/demotions across concurrent transactions.
  perform pg_catalog.pg_advisory_xact_lock(754686419850642746);

  if old.role = 'admin' then
    if tg_op = 'DELETE' then
      removing_admin := true;
    elsif tg_op = 'UPDATE' then
      removing_admin := new.role is distinct from 'admin'
        or not exists (
          select 1
          from auth.users as replacement_auth_user
          where lower(replacement_auth_user.email) = lower(new.email)
        );
    end if;

    if removing_admin and not exists (
      select 1
      from public.allowed_users as other_admin
      where other_admin.id <> old.id
        and other_admin.role = 'admin'
        and exists (
          select 1
          from auth.users as other_auth_user
          where lower(other_auth_user.email) = lower(other_admin.email)
        )
    ) then
      raise exception 'The last Hamagiku administrator cannot be removed';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

alter function private.protect_last_hamagiku_admin() owner to postgres;
revoke all on function private.protect_last_hamagiku_admin() from public;
revoke all on function private.protect_last_hamagiku_admin() from anon;
revoke all on function private.protect_last_hamagiku_admin() from authenticated;
revoke all on function private.protect_last_hamagiku_admin() from service_role;

drop trigger if exists protect_last_hamagiku_admin on public.allowed_users;
create trigger protect_last_hamagiku_admin
before delete or update of role, email on public.allowed_users
for each row execute function private.protect_last_hamagiku_admin();

do $policies$
declare
  target_table text;
  existing_policy record;
begin
  -- No application table in this project intentionally supports anonymous access.
  -- Revoke ACLs from every current public table, including backend-only RAG tables
  -- that remain inaccessible because they have no authenticated RLS policy.
  for target_table in
    select pg_class.relname
    from pg_class
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relkind in ('r', 'p')
  loop
    execute format('revoke all privileges on table public.%I from public', target_table);
    execute format('revoke all privileges on table public.%I from anon', target_table);
  end loop;

  foreach target_table in array array[
    'allowed_users',
    'clients',
    'horses',
    'reports',
    'trainers',
    'horse_weights',
    'report_drafts',
    'repro_checks',
    'repro_findings',
    'repro_daily_snapshots',
    'repro_follow_up_tasks',
    'repro_followup_rules',
    'repro_covers',
    'repro_scans',
    'repro_memo_events'
  ] loop
    for existing_policy in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = target_table
    loop
      execute format(
        'drop policy %I on public.%I',
        existing_policy.policyname,
        target_table
      );
    end loop;

    execute format('alter table public.%I enable row level security', target_table);
    execute format(
      'revoke truncate, references, trigger on table public.%I from authenticated',
      target_table
    );
    execute format(
      'grant select, insert, update, delete on table public.%I to authenticated',
      target_table
    );
    execute format(
      'grant select, insert, update, delete on table public.%I to service_role',
      target_table
    );

    if target_table <> 'allowed_users' then
      execute format(
        'create policy hamagiku_allowlisted_all on public.%I '
        || 'for all to authenticated '
        || 'using ((select private.is_hamagiku_allowed_user())) '
        || 'with check ((select private.is_hamagiku_allowed_user()))',
        target_table
      );
    end if;
  end loop;
end;
$policies$;

-- These routines are intentionally invoker functions. RLS therefore remains the
-- authorization boundary even when an authenticated client calls an RPC.
alter function public.repro_recompute_follow_up_status() security invoker;
alter function public.repro_recompute_daily_snapshot(uuid, date) security invoker;
alter function public.repro_create_check(uuid, timestamp with time zone, text, text, text, jsonb, jsonb, uuid)
  security invoker;
alter function public.repro_create_cover(uuid, date, text, text, text) security invoker;

alter function public.repro_recompute_follow_up_status()
  set search_path = pg_catalog, public;
alter function public.repro_recompute_daily_snapshot(uuid, date)
  set search_path = pg_catalog, public;
alter function public.repro_create_check(uuid, timestamp with time zone, text, text, text, jsonb, jsonb, uuid)
  set search_path = pg_catalog, public;
alter function public.repro_create_cover(uuid, date, text, text, text)
  set search_path = pg_catalog, public;

do $function_acl$
declare
  target_signature text;
begin
  foreach target_signature in array array[
    'public.repro_recompute_follow_up_status()',
    'public.repro_recompute_daily_snapshot(uuid,date)',
    'public.repro_create_check(uuid,timestamp with time zone,text,text,text,jsonb,jsonb,uuid)',
    'public.repro_create_cover(uuid,date,text,text,text)'
  ] loop
    execute format('revoke all on function %s from public', target_signature);
    execute format('revoke all on function %s from anon', target_signature);
    execute format('revoke all on function %s from authenticated', target_signature);
    execute format('revoke all on function %s from service_role', target_signature);
    execute format('grant execute on function %s to authenticated', target_signature);
    execute format('grant execute on function %s to service_role', target_signature);
  end loop;
end;
$function_acl$;

create policy hamagiku_allowlisted_read
on public.allowed_users
for select
to authenticated
using (
  (select private.is_hamagiku_admin())
  or private.is_hamagiku_own_allowlist_entry(email)
);

create policy hamagiku_admin_insert
on public.allowed_users
for insert
to authenticated
with check ((select private.is_hamagiku_admin()));

create policy hamagiku_admin_update
on public.allowed_users
for update
to authenticated
using ((select private.is_hamagiku_admin()))
with check ((select private.is_hamagiku_admin()));

create policy hamagiku_admin_delete
on public.allowed_users
for delete
to authenticated
using ((select private.is_hamagiku_admin()));

comment on function private.is_hamagiku_allowed_user() is
  'RLS helper: requires auth.uid() to resolve to a current allowed_users email.';
comment on function private.is_hamagiku_admin() is
  'RLS helper: requires an allowlisted Hamagiku administrator.';
comment on function private.is_hamagiku_own_allowlist_entry(text) is
  'RLS helper: limits non-admin allowlist reads to the current Auth user.';

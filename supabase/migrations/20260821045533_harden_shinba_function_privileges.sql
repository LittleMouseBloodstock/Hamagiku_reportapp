-- Shinba Report only.
-- Move privileged helpers out of the exposed API schema, preserve stable public
-- invoker wrappers where application SQL expects them, and remove anonymous RPC
-- execution from all application functions.

do $preflight$
declare
  expected_signature text;
begin
  if to_regclass('public.workspace_memberships') is null
     or to_regclass('public.user_profiles') is null
     or to_regclass('public.workspaces') is null then
    raise exception 'Shinba function hardening preflight failed: workspace schema missing';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and (
        roles && array['anon']::name[]
        or roles && array['public']::name[]
      )
  ) then
    raise exception 'Shinba function hardening preflight failed: anonymous RLS policy detected';
  end if;

  foreach expected_signature in array array[
    'public.app_current_workspace_id()',
    'public.app_is_workspace_member(uuid)',
    'public.app_can_manage_workspace(uuid)',
    'public.handle_new_auth_user_workspace()',
    'public.provision_workspace_for_user(uuid,text)',
    'public.match_knowledge_chunks(text,integer,uuid,text,text)',
    'public.match_report_chunks(text,integer,uuid,uuid,text,text,text,uuid,uuid)',
    'public.repro_recompute_follow_up_status()',
    'public.repro_recompute_daily_snapshot(uuid,date)',
    'public.repro_create_check(uuid,timestamp with time zone,text,text,text,jsonb,jsonb,uuid)',
    'public.repro_create_cover(uuid,date,text,text,text)'
  ] loop
    if to_regprocedure(expected_signature) is null then
      raise exception 'Shinba function hardening preflight failed: missing %', expected_signature;
    end if;
  end loop;

  if not exists (
    select 1
    from pg_trigger
    where not tgisinternal
      and tgname = 'on_auth_user_created_workspace'
      and tgrelid = 'auth.users'::regclass
      and tgfoid = 'public.handle_new_auth_user_workspace()'::regprocedure
  ) then
    raise exception 'Shinba function hardening preflight failed: auth provisioning trigger mismatch';
  end if;
end;
$preflight$;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
revoke all on schema private from service_role;
grant usage on schema private to authenticated;
grant usage on schema private to service_role;

-- ALTER ... SET SCHEMA preserves the OIDs referenced by existing RLS policies,
-- column defaults, storage policies, and the auth trigger.
alter function public.app_current_workspace_id() set schema private;
alter function public.app_is_workspace_member(uuid) set schema private;
alter function public.app_can_manage_workspace(uuid) set schema private;
alter function public.provision_workspace_for_user(uuid, text) set schema private;
alter function public.handle_new_auth_user_workspace() set schema private;

alter function private.app_current_workspace_id() set search_path = '';
alter function private.app_is_workspace_member(uuid) set search_path = '';
alter function private.app_can_manage_workspace(uuid) set search_path = '';
alter function private.provision_workspace_for_user(uuid, text) set search_path = '';

alter function private.app_current_workspace_id() security definer;
alter function private.app_is_workspace_member(uuid) security definer;
alter function private.app_can_manage_workspace(uuid) security definer;
alter function private.provision_workspace_for_user(uuid, text) security definer;

-- The moved trigger function must call the moved provisioner explicitly.
create or replace function private.handle_new_auth_user_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform private.provision_workspace_for_user(new.id, new.email);
  return new;
end;
$function$;

alter function private.app_current_workspace_id() owner to postgres;
alter function private.app_is_workspace_member(uuid) owner to postgres;
alter function private.app_can_manage_workspace(uuid) owner to postgres;
alter function private.provision_workspace_for_user(uuid, text) owner to postgres;
alter function private.handle_new_auth_user_workspace() owner to postgres;
alter function private.handle_new_auth_user_workspace() security definer;

revoke all on function private.app_current_workspace_id() from public;
revoke all on function private.app_current_workspace_id() from anon;
revoke all on function private.app_current_workspace_id() from authenticated;
revoke all on function private.app_current_workspace_id() from service_role;
grant execute on function private.app_current_workspace_id() to authenticated;
grant execute on function private.app_current_workspace_id() to service_role;

revoke all on function private.app_is_workspace_member(uuid) from public;
revoke all on function private.app_is_workspace_member(uuid) from anon;
revoke all on function private.app_is_workspace_member(uuid) from authenticated;
revoke all on function private.app_is_workspace_member(uuid) from service_role;
grant execute on function private.app_is_workspace_member(uuid) to authenticated;
grant execute on function private.app_is_workspace_member(uuid) to service_role;

revoke all on function private.app_can_manage_workspace(uuid) from public;
revoke all on function private.app_can_manage_workspace(uuid) from anon;
revoke all on function private.app_can_manage_workspace(uuid) from authenticated;
revoke all on function private.app_can_manage_workspace(uuid) from service_role;
grant execute on function private.app_can_manage_workspace(uuid) to authenticated;
grant execute on function private.app_can_manage_workspace(uuid) to service_role;

revoke all on function private.provision_workspace_for_user(uuid, text) from public;
revoke all on function private.provision_workspace_for_user(uuid, text) from anon;
revoke all on function private.provision_workspace_for_user(uuid, text) from authenticated;
revoke all on function private.provision_workspace_for_user(uuid, text) from service_role;
grant execute on function private.provision_workspace_for_user(uuid, text) to service_role;

revoke all on function private.handle_new_auth_user_workspace() from public;
revoke all on function private.handle_new_auth_user_workspace() from anon;
revoke all on function private.handle_new_auth_user_workspace() from authenticated;
revoke all on function private.handle_new_auth_user_workspace() from service_role;

create or replace function public.app_current_workspace_id()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.app_current_workspace_id();
$function$;

create or replace function public.app_is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.app_is_workspace_member(p_workspace_id);
$function$;

create or replace function public.app_can_manage_workspace(p_workspace_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.app_can_manage_workspace(p_workspace_id);
$function$;

alter function public.app_current_workspace_id() owner to postgres;
alter function public.app_is_workspace_member(uuid) owner to postgres;
alter function public.app_can_manage_workspace(uuid) owner to postgres;

revoke all on function public.app_current_workspace_id() from public;
revoke all on function public.app_current_workspace_id() from anon;
revoke all on function public.app_current_workspace_id() from authenticated;
revoke all on function public.app_current_workspace_id() from service_role;
grant execute on function public.app_current_workspace_id() to authenticated;
grant execute on function public.app_current_workspace_id() to service_role;

revoke all on function public.app_is_workspace_member(uuid) from public;
revoke all on function public.app_is_workspace_member(uuid) from anon;
revoke all on function public.app_is_workspace_member(uuid) from authenticated;
revoke all on function public.app_is_workspace_member(uuid) from service_role;
grant execute on function public.app_is_workspace_member(uuid) to authenticated;
grant execute on function public.app_is_workspace_member(uuid) to service_role;

revoke all on function public.app_can_manage_workspace(uuid) from public;
revoke all on function public.app_can_manage_workspace(uuid) from anon;
revoke all on function public.app_can_manage_workspace(uuid) from authenticated;
revoke all on function public.app_can_manage_workspace(uuid) from service_role;
grant execute on function public.app_can_manage_workspace(uuid) to authenticated;
grant execute on function public.app_can_manage_workspace(uuid) to service_role;

-- These are invoker functions. A fixed path prevents object shadowing while
-- retaining the current table and vector-operator resolution.
alter function public.match_knowledge_chunks(text, integer, uuid, text, text)
  security invoker;
alter function public.match_report_chunks(text, integer, uuid, uuid, text, text, text, uuid, uuid)
  security invoker;
alter function public.repro_recompute_follow_up_status()
  security invoker;
alter function public.repro_recompute_daily_snapshot(uuid, date)
  security invoker;
alter function public.repro_create_check(uuid, timestamp with time zone, text, text, text, jsonb, jsonb, uuid)
  security invoker;
alter function public.repro_create_cover(uuid, date, text, text, text)
  security invoker;

alter function public.match_knowledge_chunks(text, integer, uuid, text, text)
  set search_path = pg_catalog, extensions, public;
alter function public.match_report_chunks(text, integer, uuid, uuid, text, text, text, uuid, uuid)
  set search_path = pg_catalog, extensions, public;
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
    'public.match_knowledge_chunks(text,integer,uuid,text,text)',
    'public.match_report_chunks(text,integer,uuid,uuid,text,text,text,uuid,uuid)',
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

-- Shinba has no anonymous RLS policies. Remove its broad table ACLs as a
-- defense-in-depth boundary while preserving explicit authenticated grants.
do $table_acl$
declare
  target_table text;
begin
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
end;
$table_acl$;

comment on schema private is
  'Non-API schema for privileged workspace and RLS helpers.';
comment on function public.app_current_workspace_id() is
  'Invoker API wrapper around the private workspace helper.';
comment on function public.app_is_workspace_member(uuid) is
  'Invoker API wrapper around the private workspace-membership helper.';
comment on function public.app_can_manage_workspace(uuid) is
  'Invoker API wrapper around the private workspace-admin helper.';

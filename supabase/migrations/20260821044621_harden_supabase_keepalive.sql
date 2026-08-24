-- A data-free endpoint for Free Plan activity checks.
-- The function deliberately touches no application table and returns no metadata.
create or replace function public.keepalive_ping()
returns text
language sql
volatile
security invoker
set search_path = ''
as $function$
  select 'ok'::text;
$function$;

alter function public.keepalive_ping() owner to postgres;

revoke all on function public.keepalive_ping() from public;
revoke all on function public.keepalive_ping() from anon;
revoke all on function public.keepalive_ping() from authenticated;
revoke all on function public.keepalive_ping() from service_role;
grant execute on function public.keepalive_ping() to anon;

comment on function public.keepalive_ping() is
  'Data-free liveness RPC for the scheduled Free Plan keepalive workflow.';

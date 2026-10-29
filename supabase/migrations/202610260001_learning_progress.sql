-- Account-scoped Learn progress and resumable drafts. Apply before enabling cloud sync.
-- Completion/accuracy values are learner activity, not certified exam results.
begin;

create table public.learning_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"lessons":{},"checkpoints":{},"drafts":{}}'::jsonb
    check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 196608),
  revision bigint not null default 1 check (revision between 1 and 2147483647),
  updated_at timestamptz not null default now()
);

create function public.touch_learning_progress() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger learning_progress_updated before update on public.learning_progress
  for each row execute function public.touch_learning_progress();

alter table public.learning_progress enable row level security;
revoke all on public.learning_progress from anon, authenticated;
grant select, insert, update on public.learning_progress to authenticated;
grant all on public.learning_progress to service_role;
create policy "Read own learning progress" on public.learning_progress for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Create own learning progress" on public.learning_progress for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Update own learning progress" on public.learning_progress for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

commit;

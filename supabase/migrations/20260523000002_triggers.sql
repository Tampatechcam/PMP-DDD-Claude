-- 20260523000002_triggers.sql
-- updated_at touch + profile creation on new auth.users insert.

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- Auto-create a profile row for every new auth user.
-- Role defaults to 'client'; promote your first admin manually (see Part 6.4).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

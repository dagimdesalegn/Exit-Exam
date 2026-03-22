-- Create exactly two login users with username/password login model.
-- Username login works by mapping username -> username@exit.local in frontend.
-- Password for both users: GINBOT24

create extension if not exists pgcrypto;

-- Ensure profile supports required fields.
alter table public.profiles add column if not exists sex text;
alter table public.profiles add column if not exists target_score int not null default 70;

-- Cleanup old identities/users for these usernames (safe for re-run).
do $$
declare
  u_email text;
  uid uuid;
begin
  foreach u_email in array array['ddagim@exit.local', 'enat@exit.local'] loop
    select id into uid from auth.users where email = u_email;
    if uid is not null then
      delete from auth.identities where user_id = uid;
      delete from public.profiles where id = uid;
      delete from auth.users where id = uid;
    end if;
  end loop;
end $$;

with new_users as (
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_sent_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  values
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'ddagim@exit.local',
    crypt('GINBOT24', gen_salt('bf')),
    now(),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"username":"ddagim"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'enat@exit.local',
    crypt('GINBOT24', gen_salt('bf')),
    now(),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"username":"enat"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  returning id, email
), new_identities as (
  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  select
    gen_random_uuid(),
    nu.id,
    jsonb_build_object('sub', nu.id::text, 'email', nu.email),
    'email',
    nu.email,
    now(),
    now(),
    now()
  from new_users nu
  returning user_id
)
insert into public.profiles (id, username, full_name, sex, target_score)
select
  nu.id,
  case when nu.email = 'ddagim@exit.local' then 'ddagim' else 'enat' end,
  case when nu.email = 'ddagim@exit.local' then 'ddagim' else 'Enat' end,
  case when nu.email = 'ddagim@exit.local' then 'male' else 'female' end,
  85
from new_users nu;

-- Link both users as partners (both directions)
insert into public.pair_links (user_id, partner_id)
select u1.id, u2.id
from public.profiles u1
join public.profiles u2 on u1.username = 'ddagim' and u2.username = 'enat'
on conflict (user_id, partner_id) do nothing;

insert into public.pair_links (user_id, partner_id)
select u2.id, u1.id
from public.profiles u1
join public.profiles u2 on u1.username = 'ddagim' and u2.username = 'enat'
on conflict (user_id, partner_id) do nothing;

-- Verify created users
select username, sex, target_score from public.profiles where username in ('ddagim', 'enat') order by username;

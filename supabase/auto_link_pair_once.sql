-- Run once to auto-link the two fixed users forever (no manual linking needed)
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

select user_id, partner_id from public.pair_links
where user_id in (
  select id from public.profiles where username in ('ddagim', 'enat')
)
order by user_id, partner_id;

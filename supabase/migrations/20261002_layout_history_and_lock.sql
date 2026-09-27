-- Dashboard change history and lock.
-- 1. Who made each layout version.
-- 2. A per-client lock: when on, only admins (and the owner) change that
--    client's dashboard layout.
-- 3. Layouts are now kept per client ("client:<slug>", "client:<slug>:ai")
--    instead of per GA4 property, so two clients on one property no longer
--    share a layout. Existing layouts and history are copied to each client.
alter table public.dashboard_layout_versions add column if not exists edited_by text;
alter table public.clients add column if not exists layout_locked boolean not null default false;

insert into public.dashboard_layouts (user_id, property_id, widgets, updated_at)
select c.user_id, 'client:' || c.slug || s.suffix, l.widgets, l.updated_at
from public.clients c
cross join (values (''), (':ai')) as s(suffix)
join public.dashboard_layouts l on l.user_id = c.user_id and l.property_id = c.property_id || s.suffix
on conflict (user_id, property_id) do nothing;

insert into public.dashboard_layout_versions (user_id, property_id, widgets, created_at, updated_at)
select c.user_id, 'client:' || c.slug || s.suffix, v.widgets, v.created_at, v.updated_at
from public.clients c
cross join (values (''), (':ai')) as s(suffix)
join public.dashboard_layout_versions v on v.user_id = c.user_id and v.property_id = c.property_id || s.suffix
where not exists (
  select 1 from public.dashboard_layout_versions x
  where x.user_id = c.user_id and x.property_id = 'client:' || c.slug || s.suffix
);

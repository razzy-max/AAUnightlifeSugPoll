-- Clear all votes first (so resets don't fall back to seed data)
delete from public.votes where voter_hash like 'seed-%';

insert into public.categories (id, name, description, active, sort_order)
values
  (1, 'SUG President', 'Overall student body leader', true, 1),
  (2, 'Vice President', 'Deputy student union leader', true, 2),
  (3, 'General Secretary', 'Administrative officer', true, 3),
  (4, 'Financial Secretary', 'Financial oversight officer', false, 4)
on conflict (id) do update
set name = excluded.name,
    description = excluded.description,
    active = excluded.active,
    sort_order = excluded.sort_order;

insert into public.candidates (id, category_id, name, position, image_url, color_index)
values
  (1, 1, 'Chukwuemeka Obi', 'Presidential Aspirant', '', 0),
  (2, 1, 'Amaka Nwosu', 'Presidential Aspirant', '', 1),
  (3, 2, 'Ibrahim Yusuf', 'Vice Presidential Aspirant', '', 0),
  (4, 2, 'Blessing Eze', 'Vice Presidential Aspirant', '', 1),
  (5, 3, 'Tunde Adeyemi', 'Gen. Secretary Aspirant', '', 0),
  (6, 3, 'Ngozi Okafor', 'Gen. Secretary Aspirant', '', 1),
  (7, 4, 'Emeka Uzo', 'Fin. Sec. Aspirant', '', 0),
  (8, 4, 'Chioma Umeh', 'Fin. Sec. Aspirant', '', 1)
on conflict (id) do update
set category_id = excluded.category_id,
    name = excluded.name,
    position = excluded.position,
    image_url = excluded.image_url,
    color_index = excluded.color_index;

insert into public.votes (voter_hash, category_id, candidate_id)
select 'seed-sug-president-' || gs::text, 1, 1 from generate_series(1, 14) gs
on conflict do nothing;

insert into public.votes (voter_hash, category_id, candidate_id)
select 'seed-sug-president-b-' || gs::text, 1, 2 from generate_series(1, 9) gs
on conflict do nothing;

insert into public.votes (voter_hash, category_id, candidate_id)
select 'seed-vice-president-' || gs::text, 2, 3 from generate_series(1, 11) gs
on conflict do nothing;

insert into public.votes (voter_hash, category_id, candidate_id)
select 'seed-vice-president-b-' || gs::text, 2, 4 from generate_series(1, 13) gs
on conflict do nothing;

insert into public.votes (voter_hash, category_id, candidate_id)
select 'seed-general-secretary-' || gs::text, 3, 5 from generate_series(1, 16) gs
on conflict do nothing;

insert into public.votes (voter_hash, category_id, candidate_id)
select 'seed-general-secretary-b-' || gs::text, 3, 6 from generate_series(1, 7) gs
on conflict do nothing;

select setval(pg_get_serial_sequence('public.categories', 'id'), (select coalesce(max(id), 1) from public.categories));
select setval(pg_get_serial_sequence('public.candidates', 'id'), (select coalesce(max(id), 1) from public.candidates));
select setval(pg_get_serial_sequence('public.votes', 'id'), (select coalesce(max(id), 1) from public.votes));

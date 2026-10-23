-- Every goal keeps one pot colour from creation on (pot-1 to pot-4). Goals made before this had none:
-- give them one in creation order, per user. Data only, and safe to run twice (only goals without a colour change).
update public.goals g
set color_token = 'pot-' || ((r.n - 1) % 4 + 1)
from (select id, row_number() over (partition by user_id order by created_at, id) as n from public.goals) r
where g.id = r.id and g.color_token is null;

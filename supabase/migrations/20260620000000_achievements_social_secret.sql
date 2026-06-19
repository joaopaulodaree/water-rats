-- ============================================================
-- Add social and secret achievement support
-- ============================================================

alter table public.achievements
  add column is_secret boolean not null default false,
  add column hidden_name text,
  add column hidden_description text;

create or replace function public.check_achievements(
  p_user_id uuid,
  p_log_id  uuid
)
returns uuid[] language plpgsql security definer as $$
declare
  v_log_count     integer;
  v_total_ml      bigint;
  v_comment_count integer;
  v_reaction_count integer;
  v_ach           record;
  v_new_ids       uuid[] := '{}';
begin
  select count(*) into v_log_count from public.water_logs where user_id = p_user_id;
  select coalesce(sum(amount_ml), 0) into v_total_ml from public.water_logs where user_id = p_user_id;
  select count(*) into v_comment_count from public.comments where user_id = p_user_id;
  select count(*) into v_reaction_count
    from public.reactions r
    join public.water_logs wl on wl.id = r.log_id
    where wl.user_id = p_user_id;

  for v_ach in
    select * from public.achievements
    where id not in (
      select achievement_id from public.user_achievements where user_id = p_user_id
    )
  loop
    if (v_ach.condition_type = 'log_count' and v_log_count >= v_ach.condition_value) or
       (v_ach.condition_type = 'total_ml' and v_total_ml >= v_ach.condition_value) or
       (v_ach.condition_type = 'comments_count' and v_comment_count >= v_ach.condition_value) or
       (v_ach.condition_type = 'reactions_on_own_photos' and v_reaction_count >= v_ach.condition_value)
    then
      insert into public.user_achievements (user_id, achievement_id)
      values (p_user_id, v_ach.id)
      on conflict do nothing;
      v_new_ids := array_append(v_new_ids, v_ach.id);
    end if;
  end loop;

  return v_new_ids;
end;
$$;

-- Clean up old seeded achievements and replace with a fresh realistic set.
delete from public.achievements where name in (
  'Primeira Gota', 'Hidratado', 'Rato D''Água', 'Centenário', 'Litro Histórico', '10 Litros', '100 Litros',
  'Hat-Trick', 'High Five', 'Lucky Seven', 'Dúzia', 'Blackjack', '42', 'Nice.', 'Continue?',
  'Pokédex', 'Duplo Centenário', 'Trezentos', 'Um Ano de Água', 'Meio Milênio', 'Número da Besta',
  'Triple Seven', 'Mestre dos Ratos', 'L33T Hydrator', 'Primeiros Goles', 'Garrafa Cheia', 'Galão',
  'Aquário', 'Barril', 'Banheira', 'Piscina', 'Metro Cúbico', 'Caixa D''Água', 'Represa'
);

insert into public.achievements (name, description, icon, condition_type, condition_value, is_secret, hidden_name, hidden_description) values
  ('Primeira Gota',        'Registrou a primeira água',                                        '💧', 'log_count', 1, false, null, null),
  ('Pequeno Realizador',    'Bebeu 10 litros no total',                                          '🥤', 'total_ml', 10000, false, null, null),
  ('Garrafa Cheia',        'Bebeu 20 litros no total',                                          '🍶', 'total_ml', 20000, false, null, null),
  ('Mestre do Copo',       'Bebeu 50 litros no total',                                          '🏆', 'total_ml', 50000, false, null, null),
  ('Maré Constante',       'Registrou 30 vezes',                                                '🌊', 'log_count', 30, false, null, null),
  ('Rato D''Água',         'Registrou 75 vezes',                                                '🐀', 'log_count', 75, false, null, null),
  ('Social Starter',        'Comentou 5 vezes e entrou no papo',                                '💬', 'comments_count', 5, false, null, null),
  ('Fotos que Inspiram',    'Recebeu 5 reações nas suas fotos',                                 '📸', 'reactions_on_own_photos', 5, false, null, null),
  ('Onda Secreta',         'Alcançou um padrão misterioso nos seus registros.',                '🌌', 'log_count', 13, true, 'Conquista Secreta!', 'Ainda não sabe o que isso é, mas vai descobrir.'),
  ('Viajante Subaquático', 'Bebeu 13,370 ml e encontrou o segredo do oceano.',                 '🧭', 'total_ml', 13370, true, 'Conquista Secreta!', 'Algo oculto está à espera de quem bebe com curiosidade.');

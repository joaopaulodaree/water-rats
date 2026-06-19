-- ============================================================
-- Fix achievements: keep realistic ones, remove only the extreme ones
-- ============================================================

-- Remove only the impossible/extreme achievements
delete from public.achievements where name in (
  'Mestre dos Ratos',      -- 1000 registros
  'L33T Hydrator',         -- 1337 registros
  'Número da Besta',       -- 666 registros
  'Triple Seven',          -- 777 registros
  'Pokédex',               -- 150 registros
  'Duplo Centenário',      -- 200 registros
  'Trezentos',             -- 300 registros
  'Um Ano de Água',        -- 365 registros
  'Meio Milênio',          -- 500 registros
  'Represa',               -- 10 milhões de ml
  'Caixa D''Água',         -- 5 milhões de ml
  'Metro Cúbico',          -- 1 milhão de ml
  'Piscina',               -- 500 litros
  'Banheira'               -- 200 litros
);

-- Re-insert the realistic ones that were deleted
insert into public.achievements (name, description, icon, condition_type, condition_value, is_secret, hidden_name, hidden_description) values
  ('Hat-Trick',            'Registrou 3 vezes — chapéu de mestre!',                '⚽', 'log_count', 3, false, null, null),
  ('High Five',            'Registrou 5 vezes — bate aqui!',                      '✋', 'log_count', 5, false, null, null),
  ('Lucky Seven',          'Registrou 7 vezes — número da sorte!',                '🍀', 'log_count', 7, false, null, null),
  ('Dúzia',                'Registrou 12 vezes — uma dúzia certinha',             '🥚', 'log_count', 12, false, null, null),
  ('Blackjack',            '21 registros — bate e ganha!',                        '🃏', 'log_count', 21, false, null, null),
  ('42',                   '42 registros — a resposta para tudo.',                '🌌', 'log_count', 42, false, null, null),
  ('Nice.',                '69 registros. Você sabe.',                            '😏', 'log_count', 69, false, null, null),
  ('Continue?',            '99 registros — insira ficha para continuar.',         '🎮', 'log_count', 99, false, null, null),
  ('Primeiros Goles',      'Bebeu 500 ml no total',                              '🥤', 'total_ml', 500, false, null, null),
  ('Garrafa Cheia',        'Bebeu 2 litros no total',                            '🍶', 'total_ml', 2000, false, null, null),
  ('Galão',                'Bebeu 5 litros no total',                            '🫗', 'total_ml', 5000, false, null, null),
  ('Aquário',              'Bebeu 20 litros no total — tá virando peixe',        '🐠', 'total_ml', 20000, false, null, null),
  ('Barril',               'Bebeu 50 litros no total',                           '🪣', 'total_ml', 50000, false, null, null)
on conflict do nothing;

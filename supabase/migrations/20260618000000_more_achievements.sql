-- ============================================================
-- Water Rats — more achievements
-- ============================================================

insert into public.achievements (name, description, icon, condition_type, condition_value) values

  -- ── Marcos de registros (log_count) ──────────────────────

  -- early game
  ('Hat-Trick',         'Registrou 3 vezes — chapéu de mestre!',         '⚽', 'log_count', 3),
  ('High Five',         'Registrou 5 vezes — bate aqui!',                '✋', 'log_count', 5),
  ('Lucky Seven',       'Registrou 7 vezes — número da sorte!',          '🍀', 'log_count', 7),
  ('Dúzia',             'Registrou 12 vezes — uma dúzia certinha',       '🥚', 'log_count', 12),

  -- mid game
  ('Blackjack',         '21 registros — bate e ganha!',                  '🃏', 'log_count', 21),
  ('42',                '42 registros — a resposta para tudo.',          '🌌', 'log_count', 42),
  ('Nice.',             '69 registros. Você sabe.',                      '😏', 'log_count', 69),
  ('Continue?',         '99 registros — insira ficha para continuar.',   '🎮', 'log_count', 99),

  -- high scores
  ('Pokédex',           '150 registros — gotta catch ''em all!',         '🔴', 'log_count', 150),
  ('Duplo Centenário',  '200 registros — dobrou a aposta.',              '🥂', 'log_count', 200),
  ('Trezentos',         '300 registros — This is SPARTA!',               '⚔️',  'log_count', 300),
  ('Um Ano de Água',    '365 registros — 365 dias hidratado.',           '📅', 'log_count', 365),
  ('Meio Milênio',      '500 registros — metade do caminho para a glória.', '🏛️', 'log_count', 500),

  -- legendary
  ('Número da Besta',   '666 registros — hail hydration!',              '😈', 'log_count', 666),
  ('Triple Seven',      '777 registros — jackpot total!',               '🎰', 'log_count', 777),
  ('Mestre dos Ratos',  '1000 registros. Lenda. Absoluta.',             '👑', 'log_count', 1000),
  ('L33T Hydrator',     '1337 registros. Você é elite.',                '🖥️', 'log_count', 1337),

  -- ── Marcos de volume (total_ml) ──────────────────────────

  -- starter
  ('Primeiros Goles',   'Bebeu 500 ml no total',                        '🥤', 'total_ml', 500),
  ('Garrafa Cheia',     'Bebeu 2 litros no total',                      '🍶', 'total_ml', 2000),
  ('Galão',             'Bebeu 5 litros no total',                      '🫗', 'total_ml', 5000),

  -- scaling up
  ('Aquário',           'Bebeu 20 litros no total — tá virando peixe',  '🐠', 'total_ml', 20000),
  ('Barril',            'Bebeu 50 litros no total',                     '🪣', 'total_ml', 50000),

  -- absurd volumes
  ('Banheira',          'Bebeu 200 litros no total — encheu a banheira!',   '🛁', 'total_ml', 200000),
  ('Piscina',           'Bebeu 500 litros no total — piscina do quintal!',  '🏊', 'total_ml', 500000),
  ('Metro Cúbico',      'Bebeu 1000 litros — 1 m³ de água dentro de você.', '🧊', 'total_ml', 1000000),
  ('Caixa D''Água',     'Bebeu 5000 litros. Você É uma caixa d''água.',     '🏗️', 'total_ml', 5000000),
  ('Represa',           'Bebeu 10.000 litros. Fenômeno da natureza.',       '🌊', 'total_ml', 10000000);

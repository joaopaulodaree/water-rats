export interface ContextLabel {
  text: string;
  description: string;
}

export function getContextLabel(amountMl: number, createdAt: string): ContextLabel {
  const date = new Date(createdAt);
  const hour = date.getHours();
  const minute = date.getMinutes();
  const hhmm = hour * 100 + minute;

  // 1. Magic number exato (quantidade)
  if (amountMl === 666)  return { text: "Número da Besta 😈", description: "666 ml — o número do capeta" };
  if (amountMl === 777)  return { text: "Jackpot! 🎰",         description: "777 ml — sorte total" };
  if (amountMl === 420)  return { text: "Uhh 🌿",              description: "420 ml — você sabe o que é" };
  if (amountMl === 1337) return { text: "Hacker 🖥️",           description: "1337 ml — leet speak" };
  if (amountMl === 100)  return { text: "Centavinho 💯",        description: "100 ml exatos — precisão cirúrgica" };
  if (amountMl === 1000) return { text: "Milênio 🎯",           description: "1000 ml — número redondo perfeito" };

  // 2. Horário especial exato
  if (hhmm === 1337) return { text: "Hora hacker 🖥️",          description: "13:37 — leet hour" };
  if (hhmm === 1111) return { text: "Faça um pedido ⭐",        description: "11:11 — make a wish" };
  if (hhmm === 0)    return { text: "Meia-noite em ponto 🕛",   description: "00:00 — zero absoluto" };

  // 3. Faixa de quantidade
  if (amountMl >= 2000) return { text: "Golfinho 🐬",           description: "Bebeu mais de 2 litros" };
  if (amountMl >= 1000) return { text: "Modo aquário 🐠",        description: "Bebeu mais de 1 litro" };
  if (amountMl >= 750)  return { text: "Rato d'água 🐀",         description: "Bebeu 750 ml ou mais" };
  if (amountMl >= 500)  return { text: "Glub glub 🫧",           description: "Bebeu meio litro ou mais" };
  if (amountMl <= 50)   return { text: "Seca total 🌵",          description: "Menos de 50 ml — isso mal molha os dentes" };

  // 4. Faixa de horário (fallback)
  if (hour >= 0  && hour < 5)  return { text: "Fantasma 👻",             description: "Postou entre 00:00 e 05:00" };
  if (hour >= 5  && hour < 8)  return { text: "Madrugador 🌅",           description: "Postou entre 05:00 e 08:00" };
  if (hour >= 8  && hour < 11) return { text: "Bom dia 💧",              description: "Postou entre 08:00 e 11:00" };
  if (hour >= 11 && hour < 14) return { text: "Almoço regado 🍽️",       description: "Postou entre 11:00 e 14:00" };
  if (hour >= 14 && hour < 17) return { text: "Soninho não 🫠",          description: "Postou entre 14:00 e 17:00" };
  if (hour >= 17 && hour < 20) return { text: "Expediente encerrado 😎", description: "Postou entre 17:00 e 20:00" };
  if (hour >= 20 && hour < 23) return { text: "Boa noite 🌙",            description: "Postou entre 20:00 e 23:00" };
  return { text: "Coruja 🦉", description: "Postou entre 23:00 e 00:00" };
}

// Captions antigas que eram geradas automaticamente — suprimir no feed
export const LEGACY_AUTO_CAPTIONS = new Set([
  "Golfinho 🐬",
  "Modo aquário 🐠",
  "Rato d'água 🐀",
  "Glub glub 🫧",
  "Seca total 🌵",
  "Madrugador 🌅",
  "Bom dia 💧",
  "Almoço regado 🍽️",
  "Soninho não 🫠",
  "Expediente encerrado 😎",
  "Boa noite 🌙",
  "Insônia 👻",
]);

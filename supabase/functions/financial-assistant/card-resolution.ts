type CardName = { id: string; name: string };

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function alias(value: string) {
  return normalize(value)
    .split(' ')
    .filter(
      (word) =>
        !['cartao', 'banco', 'credito', 'de', 'do', 'da'].includes(word),
    )
    .join(' ');
}

/** Match only the authenticated user's active catalog; never guess between cards. */
export function resolveCardName<T extends CardName>(
  cards: T[],
  name: string | null,
): T | undefined {
  if (name === null) return cards.length === 1 ? cards[0] : undefined;
  const normalized = normalize(name);
  if (!normalized) return undefined;
  const exact = cards.filter((card) => normalize(card.name) === normalized);
  if (exact.length) return exact.length === 1 ? exact[0] : undefined;
  const hint = alias(name);
  if (!hint) return undefined;
  // Word boundaries prevent “Inter” from matching “Internacional”.
  const matches = cards.filter((card) =>
    ` ${alias(card.name)} `.includes(` ${hint} `),
  );
  return matches.length === 1 ? matches[0] : undefined;
}

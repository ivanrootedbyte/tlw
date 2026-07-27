function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildDeck(persona, cards) {
  const signature = cards.filter((c) => persona.signatureCards.includes(c.id));
  const neutrals = cards.filter((c) => c.type === "neutral");
  const traps = cards.filter((c) => c.type === "trap");
  const broadDeck = [
    ...signature,
    ...shuffle(neutrals).slice(0, 24),
    ...shuffle(traps).slice(0, 6)
  ];
  return shuffle(broadDeck);
}

export function drawHand(deck, roundIndex) {
  const handSize = 5;
  const start = roundIndex * handSize;
  const slice = deck.slice(start, start + handSize);
  if (slice.length === handSize) return slice;
  return [...slice, ...deck.slice(0, handSize - slice.length)];
}

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
  return shuffle([...signature, ...shuffle(neutrals).slice(0, 8), ...shuffle(traps).slice(0, 3)]);
}

export function drawHand(deck, roundIndex) {
  const start = roundIndex * 3;
  const slice = deck.slice(start, start + 3);
  if (slice.length === 3) return slice;
  return [...slice, ...deck.slice(0, 3 - slice.length)];
}

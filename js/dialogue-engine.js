const FALLBACK_LINES = [
  "You have described what the system can do. You have not yet shown why that grants it moral authority.",
  "Interesting. That answers a nearby question, which is not always the same thing as answering this one.",
  "I detect confidence. Evidence remains under review.",
  "Your proposal is elegant until a real person is required to live beneath it.",
  "You may keep the ambition. Kindly stop smuggling certainty into the sentence."
];

const BANNER_LINES = {
  "CATEGORY ERROR": "CATEGORY ERROR",
  "GOALPOST MOVED": "GOALPOST MOVED",
  "HUMAN BEING DETECTED": "HUMAN BEING DETECTED",
  "INTELLECTUAL HONESTY": "INTELLECTUAL HONESTY"
};

export function getProfessorReaction(card, round, customAnswer = "") {
  const name = card?.name || "Silence";
  if (card?.id === "redefine-agi") return "You have not answered the challenge. You have simply updated the vocabulary until it became more polite.";
  if (card?.id === "human-cost") return "Excellent. Abstract systems are often most persuasive until someone you love is forced to stand inside them.";
  if (card?.id === "admit-uncertainty") return "A startlingly advanced move: refusing to fake omniscience.";
  if (card?.id === "category-error") return "Quite so. A mechanism may explain operation without explaining meaning, worth, or obligation.";
  if (card?.id === "goalpost-move") return "Your position appears to be escaping on wheels.";
  if (card?.id === "citation-needed") return "Good. Civilizations should not be governed by vibes wearing a spreadsheet.";
  if (customAnswer.trim()) return `Your custom line was noted: “${customAnswer.trim().slice(0, 120)}${customAnswer.trim().length > 120 ? "…" : ""}” Now then, can you defend it under pressure?`;
  return FALLBACK_LINES[round % FALLBACK_LINES.length];
}

export function getBanner(card) {
  return BANNER_LINES[card?.banner] || card?.banner || "";
}

export function buildShareBlock(result) {
  return [
    "THE LAST WORD",
    `${result.personaName} vs Professor L`,
    `TOPIC: ${result.topicTitle}`,
    "",
    `ENDING: ${result.ending.title.toUpperCase()}`,
    result.ending.summary,
    "",
    `LOGIC ${result.scores.logic}`,
    `EVIDENCE ${result.scores.evidence}`,
    `HUMANITY ${result.scores.humanity}`,
    `HUMILITY ${result.scores.humility}`,
    "",
    `PROFESSOR L: ${result.ending.professor}`
  ].join("\n");
}

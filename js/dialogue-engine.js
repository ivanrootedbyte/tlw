const FALLBACK_LINES = [
  "You explained what it can do. You still have to show why it should be trusted.",
  "That answered a nearby question. This one is still standing here, waving politely.",
  "I hear confidence. I am still waiting for proof.",
  "This idea looks neat until a real person has to live under it.",
  "You can keep the dream. Please stop smuggling certainty into it.",
  "That sounds brave. It may also be unpaid risk for someone else.",
  "Strong claim. Tiny bridge. Let us inspect the bridge."
];

const BANNER_LINES = {
  "CATEGORY ERROR": "CATEGORY ERROR",
  "GOALPOST MOVED": "GOALPOST MOVED",
  "HUMAN BEING DETECTED": "HUMAN BEING DETECTED",
  "HONESTY BONUS": "HONESTY BONUS",
  "ACTUAL ANSWER": "ACTUAL ANSWER",
  "PROOF DEPLOYED": "PROOF DEPLOYED",
  "FEAR SPOTTED": "FEAR SPOTTED",
  "TRIBE DETECTED": "TRIBE DETECTED"
};

export function getProfessorReaction(card, round, customAnswer = "") {
  if (card?.id === "human-cost") return "Good. Ideas grow up when they are forced to meet the person affected by them.";
  if (card?.id === "admit-uncertainty") return "Excellent. You admitted you might be wrong and the ceiling did not collapse.";
  if (card?.id === "category-error") return "Correct. ‘It can’ is not the same as ‘it should.’ That little gap has swallowed empires.";
  if (card?.id === "goalpost-move") return "Your position appears to have wheels. Kindly stop rolling it away from the question.";
  if (card?.id === "citation-needed" || card?.id === "evidence-shield") return "Good. Big claims need receipts. Vibes are not invoices.";
  if (card?.id === "define-your-terms") return "Yes. Define the word before it changes costume halfway through the argument.";
  if (card?.id === "truth-vs-tribe") return "Brave move. Your side may be annoyed. Truth has survived worse.";
  if (customAnswer.trim()) return `You said: “${customAnswer.trim().slice(0, 130)}${customAnswer.trim().length > 130 ? "…" : "”"} Now defend it without hiding behind fog.`;
  return FALLBACK_LINES[round % FALLBACK_LINES.length];
}

export function getBanner(card) {
  return BANNER_LINES[card?.banner] || card?.banner || "ROUND PLAYED";
}

export function buildShareBlock(result) {
  if (result?.mode === "star-trial") {
    return [
      "THE LAST WORD · STAR TRIAL",
      `${result.personaName} vs Professor L`,
      `QUESTION: ${result.topicTitle}`,
      "",
      `STARS: ${result.stars}/${result.maxStars || 10}`,
      `ENDING: ${result.ending.title.toUpperCase()}`,
      result.ending.summary,
      "",
      `SWAPS: ${result.swaps || 0}`,
      `NEXT: ${result.nextHook || "Try another persona."}`,
      "",
      `PROFESSOR L: ${result.ending.professor}`
    ].join("\n");
  }
  return [
    "THE LAST WORD",
    `${result.personaName} vs Professor L`,
    `TOPIC: ${result.topicTitle}`,
    "",
    `ENDING: ${result.ending.title.toUpperCase()}`,
    result.ending.summary,
    "",
    `LOGIC ${result.scores.logic}`,
    `PROOF ${result.scores.evidence}`,
    `PEOPLE ${result.scores.humanity}`,
    `HONESTY ${result.scores.humility}`,
    "",
    `PROFESSOR L: ${result.ending.professor}`
  ].join("\n");
}

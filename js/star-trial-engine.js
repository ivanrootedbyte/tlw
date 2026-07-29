export const STAR_MIN = 0;
export const STAR_MAX = 20;
export const STARTING_STARS = 10;

export function getMaxStars(trialData = null) {
  return Number(trialData?.maxStars || STAR_MAX);
}

export function getStartingStars(trialData = null) {
  return Number(trialData?.startingStars || STARTING_STARS);
}

export function clampStars(value, maxStars = STAR_MAX) {
  return Math.max(STAR_MIN, Math.min(maxStars, Number(value) || 0));
}

export function getCustomTrial(topic, trialData) {
  return trialData?.customTrials?.[topic?.id] || null;
}

export function getRoundsPerTrial(topic, trialData) {
  const custom = getCustomTrial(topic, trialData);
  return custom?.rounds?.length || Number(trialData?.roundsPerTrial || 8);
}

export function getCategoryPlan(topic, trialData) {
  const plans = trialData.categoryPlans || {};
  return plans[topic?.category] || trialData.defaultPlan || ["claim", "truth", "power", "humanCost", "assumption", "mercy", "final"];
}

export function getRoundType(topic, trialData, roundIndex) {
  const plan = getCategoryPlan(topic, trialData);
  return plan[roundIndex % plan.length];
}

export function fillTemplate(text, topic, persona = null) {
  return String(text || "")
    .replaceAll("{{topic}}", topic?.title || "this question")
    .replaceAll("{{category}}", topic?.categoryLabel || "this issue")
    .replaceAll("{{persona}}", persona?.displayName || "your persona");
}

export function buildProfessorQuestion(topic, trialData, roundIndex) {
  const custom = getCustomTrial(topic, trialData);
  const customRound = custom?.rounds?.[roundIndex];
  if (customRound) {
    return {
      ...customRound,
      type: customRound.type || customRound.id || `premium-${roundIndex + 1}`,
      title: customRound.title || `Round ${roundIndex + 1}`,
      prompt: customRound.prompt,
      professor: customRound.professor || customRound.prompt,
      hint: customRound.hint || "Choose the answer that protects truth and real people.",
      roundNumber: roundIndex + 1,
      custom: true
    };
  }
  const type = getRoundType(topic, trialData, roundIndex);
  const challenge = trialData.challenges[type] || trialData.challenges.claim;
  return {
    type,
    title: challenge.title,
    prompt: fillTemplate(challenge.prompt, topic),
    hint: fillTemplate(challenge.hint, topic),
    professor: fillTemplate(challenge.professor, topic),
    roundNumber: roundIndex + 1
  };
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

export function deterministicShuffle(items, seed) {
  const arr = [...items];
  let state = hashString(seed);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    state = (state * 1664525 + 1013904223) % 4294967296;
    const j = state % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getPersonaAnswers(persona, round, trialData, topic) {
  const customAnswers = round?.answersByPersona?.[persona.id] || round?.answersByPersona?.default;
  if (Array.isArray(customAnswers) && customAnswers.length) {
    return deterministicShuffle(customAnswers.map((answer, index) => ({
      ...answer,
      id: `${persona.id}-${round.id || round.type}-${answer.id || index}`,
      text: fillTemplate(answer.text, topic, persona),
      professor: fillTemplate(answer.professor, topic, persona),
      lesson: fillTemplate(answer.lesson, topic, persona)
    })), `${topic.id}-${persona.id}-${round.id || round.type}`);
  }
  const personaSet = trialData.personaAnswers?.[persona.id] || trialData.personaAnswers?.default || {};
  const answers = personaSet[round.type] || personaSet.claim || trialData.personaAnswers.default.claim;
  return deterministicShuffle(answers.map((answer, index) => ({
    ...answer,
    id: `${persona.id}-${round.type}-${answer.id || index}`,
    text: fillTemplate(answer.text, topic, persona),
    professor: fillTemplate(answer.professor, topic, persona),
    lesson: fillTemplate(answer.lesson, topic, persona)
  })), `${topic.id}-${persona.id}-${round.type}`);
}

export function getSwapCost(swapCount) {
  if (swapCount <= 0) return 1;
  if (swapCount === 1) return 2;
  return 3;
}

export function applyStarChange(currentStars, change, maxStars = STAR_MAX) {
  return clampStars(currentStars + Number(change || 0), maxStars);
}

export function starLabel(change) {
  if (change > 0) return `+${change} star${change === 1 ? "" : "s"}`;
  if (change < 0) return `${change} star${change === -1 ? "" : "s"}`;
  return "0 stars";
}

export function scoreToMeters(stars, maxStars = STAR_MAX) {
  const base = Math.round((stars / maxStars) * 100);
  return {
    logic: Math.max(10, Math.min(100, base + 8)),
    evidence: Math.max(10, Math.min(100, base - 2)),
    humanity: Math.max(10, Math.min(100, base + 4)),
    humility: Math.max(10, Math.min(100, base))
  };
}

export function calculateStarEnding({ stars, maxStars = STAR_MAX, history, swaps }) {
  const greatAnswers = history.filter((item) => item.answer?.stars >= 2).length;
  const costlyAnswers = history.filter((item) => item.answer?.stars < 0).length;
  const noSwap = swaps === 0;
  if (stars >= maxStars && noSwap && greatAnswers >= 6) {
    return { title: "20-Star Clear", summary: "You held one persona steady through the long trial and still found the wise path.", professor: "Excellent. Longer debate did not make you louder. It made you clearer." };
  }
  if (stars >= maxStars) {
    return { title: "Professor L Approved", summary: "You reached the 20-star ceiling. Your answer protected truth, limits, and people.", professor: "Good. You won without pretending the issue was simple. The tea remains undisturbed." };
  }
  if (stars >= Math.ceil(maxStars * 0.8)) {
    return { title: "Strong Case", summary: "You nearly cleared the trial. One answer probably forgot a real person.", professor: "Strong work. Not flawless, but the argument has bones." };
  }
  if (stars >= Math.ceil(maxStars * 0.55) && costlyAnswers <= 2) {
    return { title: "Still Standing", summary: "Your argument survived, but it needs sharper wording and better guardrails.", professor: "Not bad. Your idea may stand, but it should not be allowed to drive unsupervised." };
  }
  if (stars >= Math.ceil(maxStars * 0.3)) {
    return { title: "Argument in Trouble", summary: "The idea had energy, but Professor L found serious gaps.", professor: "I enjoyed the confidence. I remain concerned about the bridge between your claim and reality." };
  }
  return { title: "Debate Lost", summary: "Your argument collapsed before it could become policy. That is a mercy.", professor: "This is not the end. It is what happens when a bad idea gets caught early enough to spare everyone paperwork." };
}

export function nextHook(result) {
  if (result.stars >= result.maxStars && result.swaps === 0) return "Try a harder topic with the same persona.";
  if (result.stars >= Math.ceil(result.maxStars * 0.8)) return "Replay the round where Professor L pushed back hardest.";
  if (result.swaps > 1) return "Try the No-Swap Challenge: one persona, no escape hatch.";
  if (result.stars <= Math.ceil(result.maxStars * 0.25)) return "Retry from collapse. Look for the human cost before Professor L does.";
  return "Try the same question with your weakest persona.";
}

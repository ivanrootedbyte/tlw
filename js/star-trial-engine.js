export const STAR_MIN = 0;
export const STAR_MAX = 10;
export const STARTING_STARS = 5;

export function clampStars(value) {
  return Math.max(STAR_MIN, Math.min(STAR_MAX, Number(value) || 0));
}

export function getCategoryPlan(topic, trialData) {
  const plans = trialData.categoryPlans || {};
  return plans[topic?.category] || trialData.defaultPlan || ["claim", "define", "humanCost", "mercy", "final"];
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

export function applyStarChange(currentStars, change) {
  return clampStars(currentStars + Number(change || 0));
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

export function calculateStarEnding({ stars, history, personaName, topicTitle, swaps }) {
  const greatAnswers = history.filter((item) => item.answer?.stars >= 3).length;
  const costlyAnswers = history.filter((item) => item.answer?.stars < 0).length;
  const noSwap = swaps === 0;
  if (stars >= 10 && noSwap && greatAnswers >= 3) {
    return {
      title: "10-Star Clear",
      summary: "You held one persona steady and still found the wise path.",
      professor: "Excellent. You did not just sound clever. You protected truth and people at the same time. The tea is safe."
    };
  }
  if (stars >= 10) {
    return {
      title: "Professor L Approved",
      summary: "You reached 10 stars. Your answer became clearer, humbler, and more human.",
      professor: "Good. You did not win by shouting louder. You won by thinking better. Rare enough to be framed."
    };
  }
  if (stars >= 8) {
    return {
      title: "Strong Case",
      summary: "You nearly cleared the trial. One answer probably cost the perfect run.",
      professor: "Strong work. Not flawless, but strong. The missing star is hiding near the person your argument almost forgot."
    };
  }
  if (stars >= 5 && costlyAnswers <= 1) {
    return {
      title: "Still Standing",
      summary: "Your argument survived, but it needs sharper wording and better care for real people.",
      professor: "Not bad. Your idea can stand, but it should not be allowed to drive without supervision."
    };
  }
  if (stars >= 3) {
    return {
      title: "Argument in Trouble",
      summary: "The idea had energy, but Professor L found serious gaps.",
      professor: "I enjoyed the confidence. I remain concerned about the bridge between your claim and reality."
    };
  }
  return {
    title: "Debate Lost",
    summary: "Your argument collapsed before it could become policy. That is a mercy.",
    professor: "This is not the end. It is what happens when a bad idea gets caught early enough to spare everyone paperwork."
  };
}

export function nextHook(result) {
  if (result.stars >= 10 && result.swaps === 0) return "Try a harder topic with the same persona.";
  if (result.stars >= 8) return "Find the missing star by replaying the round where you lost points.";
  if (result.swaps > 1) return "Try the No-Swap Challenge: one persona, no escape hatch.";
  if (result.stars <= 3) return "Retry from collapse. Look for the human cost before Professor L does.";
  return "Try the same question with your weakest persona.";
}

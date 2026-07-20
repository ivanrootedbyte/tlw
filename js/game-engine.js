export function createInitialScores(persona) {
  return {
    logic: persona?.stats?.Logic ?? 60,
    evidence: persona?.stats?.Evidence ?? 60,
    humanity: persona?.stats?.Humanity ?? 60,
    humility: persona?.stats?.Humility ?? 60
  };
}

export function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function applyEffects(scores, effects = {}) {
  return {
    logic: clampScore(scores.logic + (effects.logic || 0)),
    evidence: clampScore(scores.evidence + (effects.evidence || 0)),
    humanity: clampScore(scores.humanity + (effects.humanity || 0)),
    humility: clampScore(scores.humility + (effects.humility || 0))
  };
}

export function averageScore(scores) {
  return (scores.logic + scores.evidence + scores.humanity + scores.humility) / 4;
}

export function calculateEnding(scores) {
  const avg = averageScore(scores);
  if (scores.logic >= 80 && scores.humanity >= 75 && scores.humility >= 60) {
    return {
      title: "Disciplined Victory",
      summary: "Your argument held together without sacrificing the people forced to live under it.",
      professor: "A rare event. You argued with strength and still remembered there were humans in the room."
    };
  }
  if (scores.logic >= 75 && scores.humanity < 50) {
    return {
      title: "Logically Sharp, Humanly Chilling",
      summary: "Your case was efficient, consistent, and quietly terrifying once real people entered the frame.",
      professor: "Your system functions beautifully, provided one does not mind becoming a variable inside it."
    };
  }
  if (scores.humility >= 80) {
    return {
      title: "Honest Revision",
      summary: "You narrowed or changed your position instead of pretending the contradiction never happened.",
      professor: "There are worse outcomes than losing an argument. For example: keeping it dishonestly."
    };
  }
  if (scores.logic < 45 && scores.humility < 45) {
    return {
      title: "Spectacular Collapse",
      summary: "The argument achieved dramatic velocity before separating from its evidence.",
      professor: "One admired the confidence. The reasoning, however, has not survived."
    };
  }
  if (avg >= 62) {
    return {
      title: "Argument Survived, Narrowly",
      summary: "The claim still stands, though now in a smaller, more defensible shape.",
      professor: "You have not won a utopia, but you may have rescued a sentence."
    };
  }
  return {
    title: "The Question Won",
    summary: "The debate exposed enough weakness that the question itself became the most honest outcome.",
    professor: "It is not failure to discover that a slogan cannot carry a civilization."
  };
}

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
      title: "Strong and Human",
      summary: "Your argument stayed clear and still treated people like people.",
      professor: "Good. You did not win by turning humans into footnotes. Very rare. I shall protect the tea."
    };
  }
  if (scores.logic >= 75 && scores.humanity < 50) {
    return {
      title: "Smart but Scary",
      summary: "Your idea made sense on paper, but real people got squeezed by it.",
      professor: "That was tidy. So is a spreadsheet. People, however, keep having faces."
    };
  }
  if (scores.humility >= 80) {
    return {
      title: "Honest Upgrade",
      summary: "You fixed your view instead of defending the broken version.",
      professor: "Changing your mind is not losing. It is cleaning the room after the argument exploded."
    };
  }
  if (scores.logic < 45 && scores.humility < 45) {
    return {
      title: "Argument Crash",
      summary: "The confidence was impressive. The reasoning did not make it home.",
      professor: "I enjoyed the speed. I did not enjoy the steering."
    };
  }
  if (avg >= 62) {
    return {
      title: "Still Standing",
      summary: "Your claim survived, but it had to become smaller and clearer.",
      professor: "A smaller true claim beats a giant slogan wearing sunglasses."
    };
  }
  return {
    title: "The Question Won",
    summary: "The debate exposed enough problems that the honest answer is: keep thinking.",
    professor: "That is not failure. It is the beginning of not fooling yourself."
  };
}

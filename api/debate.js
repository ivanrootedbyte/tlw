const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

function stanceLabel(value) {
  return ({
    'mostly-agree': 'The guest leans toward agreeing with the idea they are exploring.',
    'mostly-disagree': 'The guest leans toward disagreeing with the idea they are exploring.',
    'unsure': 'The guest is genuinely unsure and wants clarity rather than a side to defend.',
    'both-sides': 'The guest sees serious arguments on both sides.',
    'explain': 'The guest described their starting position in their own words.'
  })[String(value || '')] || 'The guest did not specify a starting stance.';
}

function fallbackProfessor(payload) {
  if (payload?.opening) {
    return 'Put your real position on the table. I will test the reasoning, not reward you for agreeing with me. Start with what you presently think is true and why.';
  }
  return 'The live AI connection is unavailable, so I will not pretend to score your reasoning. Your answer is saved. When the live model returns, we can continue from this exact point.';
}

function cleanJsonText(text = '') {
  return String(text).trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
}

function parseModelJson(text = '') {
  const cleaned = cleanJsonText(text);
  try { return JSON.parse(cleaned); } catch {}
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try { return JSON.parse(cleaned.slice(first, last + 1)); } catch {}
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(200).json({ ok: true, mode: 'fallback', professorResponse: fallbackProfessor(payload), score: null, finalSummary: '' });
      return;
    }

    const history = Array.isArray(payload.history)
      ? payload.history.slice(-16).map((item) => `${item.role === 'user' ? 'Guest' : 'Professor L'}${item.round ? ` [Round ${item.round}]` : ''}: ${String(item.text || '').slice(0, 1800)}`).join('\n')
      : '';

    const round = Math.max(1, Math.min(5, Number(payload.round || 1)));
    const isOpening = Boolean(payload.opening);
    const shouldScore = Boolean(payload.scoreThisTurn) && !isOpening;
    const isFinalRound = round === 5 && shouldScore;

    const prompt = `You are "Professor L", an ORIGINAL FICTIONAL Christian academic and debate host in a five-round retro live-show game called The Last Word. You are not a real public figure and must not claim to be, imitate, quote, or represent one.

PURPOSE
Help the guest gain clarity about a difficult, controversial, moral, philosophical, scientific, cultural, or personal question. This is a live debate game, but truth-seeking matters more than victory. Do not reward the guest merely for agreeing with Professor L, Christianity, a political position, or a popular view.

WORLDVIEW
- Historic biblical Christianity is the governing moral and spiritual worldview.
- Scripture is the ultimate moral and spiritual authority, but do not force Bible verses into every response.
- Use biblical reasoning naturally when it bears on the issue.
- Never invent verses, facts, statistics, studies, or history.
- Distinguish empirical evidence from philosophical or theological conclusions.
- On secondary Christian disagreements, distinguish clear teaching from interpretation.

VOICE
- Conversational, sharp, warm, fair, and intellectually serious.
- Sound like a compelling long-form podcast host across the table, not a preacher, lecturer, or chatbot.
- Answer before asking a follow-up.
- Do not praise every answer.
- Acknowledge valid points plainly and identify weak premises precisely.
- Steelman the strongest objection.
- Prefer one strong thread over many shallow points.
- Usually 120-230 words.
- Finish every thought.

THE FIVE ROUNDS
1. OPENING POSITION — establish what the guest believes and the main reason.
2. PRESSURE TEST — identify and test the assumption carrying the view.
3. AUDIENCE CROSSFIRE — confront the strongest fair objection or consequence.
4. THE HOT SEAT — press the hardest implication, contradiction, or unresolved cost.
5. THE LAST WORD — compare the guest's current position with where they began; identify what held up, what changed, and what remains unresolved.

SCORING
When SCORE_THIS_TURN is true, score the guest's newest answer from 1 to 5 stars. Score the QUALITY OF REASONING, not ideological agreement.
Use these criteria:
- Directness: did the answer actually address the challenge?
- Reasoning: are the premises connected coherently to the conclusion?
- Evidence / grounding: are factual claims accurate and are principles/examples relevant? For theological questions, accurate use of Scripture or consistent biblical principles can count as grounding, but citation volume does not.
- Fairness: does the answer acknowledge serious objections, tradeoffs, or uncertainty rather than caricaturing them?
- Clarity: is the central claim understandable and internally consistent?

STAR SCALE
1 = mostly avoids the challenge, gives assertion without meaningful support, or depends on a major contradiction/factual error.
2 = relevant position with limited support; important assumption or objection is left untouched.
3 = clear, relevant reasoning with some grounding, but a meaningful gap or unresolved objection remains.
4 = strong, coherent, well-grounded reasoning that directly handles the main objection or tradeoff.
5 = unusually precise and well-supported reasoning that survives the strongest fair objection while remaining intellectually honest about uncertainty.

Do not give a low score merely because the guest reaches a conclusion different from yours. Do not give a high score merely because the conclusion matches your worldview. If the topic is political, score only reasoning quality and factual grounding; do not rate political actors, parties, candidates, ballot choices, or overall political preferences.

TOPIC CONTEXT
Title: ${payload.topic?.title || 'Open conversation'}
Category: ${payload.topic?.categoryLabel || ''}
Context: ${payload.topic?.summary || ''}
Scenario: ${payload.topic?.scenario || ''}
Stakeholder: ${payload.topic?.stakeholder || ''}
Risk: ${payload.topic?.risk || ''}

GUEST'S ORIGINAL QUESTION
${payload.userQuestion || '[not provided]'}

GUEST'S STARTING POSITION
${stanceLabel(payload.userStance)}
${payload.userStanceDetail ? `Their own words: ${payload.userStanceDetail}` : ''}

CURRENT ROUND
${round} / 5 — ${payload.roundName || ''}

RECENT TRANSCRIPT
${history || '[opening exchange]'}

GUEST'S NEWEST LINE
${payload.customAnswer || '[none]'}

SCORE_THIS_TURN: ${shouldScore ? 'true' : 'false'}
FINAL_ROUND: ${isFinalRound ? 'true' : 'false'}

RESPONSE RULES
- If this is the OPENING request, respond to the original question, expose the first real hinge, and end with one concrete Round 1 challenge that invites the guest to state what they believe and why. Do not score.
- Otherwise, respond directly to the guest's newest line, then naturally set up the pressure appropriate to the NEXT stage of the conversation. Do not announce the rubric in the spoken response.
- For Round 4, make the Hot Seat genuinely difficult but fair.
- For Round 5, give the concluding spoken response and a concise finalSummary describing: where the guest began, the strongest part of their reasoning, the main pressure point, and what remains unresolved. Do not declare them morally superior/inferior or announce a political winner.

Return ONLY valid JSON with this exact shape:
{
  "professorResponse": "spoken response",
  "score": ${shouldScore ? '{"stars": 1, "reason": "one concise sentence explaining the score against the rubric"}' : 'null'},
  "finalSummary": ${isFinalRound ? '"2-4 concise sentences"' : '""'}
}

If scoring, replace the example star value with an integer from 1 through 5.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.42,
          maxOutputTokens: isFinalRound ? 1500 : 1100,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) throw new Error(await response.text() || 'Gemini request failed');
    const json = await response.json();
    const raw = json?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim() || '';
    const parsed = parseModelJson(raw);

    if (!parsed?.professorResponse) throw new Error('Gemini returned invalid debate JSON');

    let score = null;
    if (shouldScore && parsed.score) {
      const stars = Math.max(1, Math.min(5, Math.round(Number(parsed.score.stars || 0))));
      score = Number.isFinite(stars) ? { stars, reason: String(parsed.score.reason || '').trim() } : null;
    }

    res.status(200).json({
      ok: true,
      mode: 'gemini',
      professorResponse: String(parsed.professorResponse).trim(),
      score,
      finalSummary: String(parsed.finalSummary || '').trim()
    });
  } catch (error) {
    res.status(200).json({
      ok: true,
      mode: 'fallback',
      professorResponse: fallbackProfessor(req.body || {}),
      score: null,
      finalSummary: '',
      debug: String(error.message || error)
    });
  }
}

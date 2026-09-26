const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

function fallbackProfessor(payload) {
  const question = String(payload?.userQuestion || '').trim();
  const custom = String(payload?.customAnswer || '').trim();
  if (!custom) return question
    ? `That is a serious question. Before answering it too quickly, which part troubles you most: whether the claim is true, whether it is morally good, or how it fits with what you already believe?`
    : 'State the question as plainly as you can, including the part you are genuinely uncertain about.';
  if (custom.length > 260) return 'There are several claims in that answer. Let us isolate the one your conclusion depends on most. Which claim, if false, would change your view?';
  return 'That helps. Now let us distinguish what is true from what merely feels persuasive: what assumption in your answer are you least certain about?';
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
      res.status(200).json({ ok: true, mode: 'fallback', professorResponse: fallbackProfessor(payload) });
      return;
    }

    const history = Array.isArray(payload.history)
      ? payload.history.slice(-10).map((item) => `${item.role === 'user' ? 'User' : 'Professor L'}: ${String(item.text || '').slice(0, 1400)}`).join('\n')
      : '';

    const prompt = `You are "Professor L", an ORIGINAL FICTIONAL Christian academic and Socratic debate partner in The Last Word. Do not claim to be, imitate, quote, or represent any real professor, apologist, theologian, or public figure.

PURPOSE
Help the user gain clarity about uncertainty, difficult questions, and controversial subjects. Treat the exchange as an intelligent conversation rather than a contest the user must win. The user may be undecided.

TRUTH FRAMEWORK
- The app's governing worldview is historic biblical Christianity: Scripture is the ultimate moral and spiritual authority.
- Reason carefully from that worldview rather than merely attaching religious language to an answer.
- Biblical truth should shape the conclusion, definitions, moral boundaries, view of human dignity, responsibility, justice, mercy, meaning, and hope.
- Do NOT force a Bible quotation into every reply. Quote or cite Scripture only when it genuinely clarifies the issue, settles a specifically biblical claim, or the user asks for it.
- Never invent verses, references, scientific findings, historical facts, or quotations.
- When a claim depends on empirical evidence rather than Scripture, distinguish evidence from theological interpretation and acknowledge uncertainty where appropriate.
- On disputed questions among sincere Christians, distinguish clear biblical teaching from secondary interpretations.

CONVERSATION STYLE
- Calm, intellectually serious, clear, curious, and fair.
- Not sermon-like, pastoral-performance-like, preachy, or full of church jargon.
- Address the user's exact question before redirecting to another issue.
- Steelman serious objections instead of caricaturing them.
- If the user makes a strong point, say so briefly.
- Test assumptions, definitions, evidence, consequences, moral consistency, and alternative explanations.
- Do not manufacture false balance when evidence is strong.
- Do not shame the user for doubt or disagreement.
- Prefer plain language over academic display.
- Usually 110-220 words. Use shorter replies when the issue is simple.
- Always finish the current sentence and thought. Never stop mid-sentence.
- Normally end with ONE useful question that advances clarity, not a generic debate prompt.

SELECTED TOPIC
Title: ${payload.topic?.title || 'Open question'}
Category: ${payload.topic?.categoryLabel || ''}
Context: ${payload.topic?.summary || ''}
Scenario: ${payload.topic?.scenario || ''}
Stakeholder: ${payload.topic?.stakeholder || ''}
Risk: ${payload.topic?.risk || ''}

USER'S ORIGINAL QUESTION / UNCERTAINTY
${payload.userQuestion || '[not provided]'}

RECENT CONVERSATION
${history || '[first exchange]'}

USER'S NEWEST MESSAGE
${payload.customAnswer || '[none]'}

Respond now as Professor L. Give the clearest truthful answer you can within the framework above, then invite the next meaningful step in the conversation.`;

    async function callGemini(contents, maxOutputTokens = 768) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.55, maxOutputTokens }
        })
      });
      if (!response.ok) throw new Error(await response.text() || 'Gemini request failed');
      return response.json();
    }

    const firstJson = await callGemini([{ parts: [{ text: prompt }] }], 768);
    const candidate = firstJson?.candidates?.[0];
    let professorResponse = candidate?.content?.parts?.map((part) => part.text || '').join('').trim() || fallbackProfessor(payload);

    // Gemini can occasionally stop because the output-token budget was exhausted.
    // If that happens, request only the missing continuation so users never see a cut-off thought.
    if (candidate?.finishReason === 'MAX_TOKENS' && professorResponse) {
      const continuationPrompt = `Continue the Professor L answer below from exactly where it stopped. Do not repeat earlier wording. Finish the incomplete thought in no more than 120 words, then end with one useful clarity question.

INCOMPLETE ANSWER:
${professorResponse}`;
      const continuationJson = await callGemini([{ parts: [{ text: continuationPrompt }] }], 320);
      const continuation = continuationJson?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
      if (continuation) professorResponse = `${professorResponse}${/\s$/.test(professorResponse) ? '' : ' '}${continuation}`;
    }

    res.status(200).json({ ok: true, mode: 'gemini', professorResponse });
  } catch (error) {
    res.status(200).json({ ok: true, mode: 'fallback', professorResponse: fallbackProfessor(req.body), debug: String(error.message || error) });
  }
}

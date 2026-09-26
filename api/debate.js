const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

function fallbackProfessor(payload) {
  const custom = String(payload?.customAnswer || '').trim();
  if (!custom) return 'State your position plainly, then tell me which principle you are relying on.';
  if (custom.length > 260) return 'There are several claims in that answer. Choose the one your conclusion most depends on, then defend that link without borrowing certainty from the other claims.';
  return 'That gives me your conclusion. Now separate the evidence from the judgment: what fact would support your view, and what principle tells you what ought to follow from it?';
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
      ? payload.history.slice(-8).map((item) => `${item.role === 'user' ? 'User' : 'Professor Lennox'}: ${String(item.text || '').slice(0, 1200)}`).join('\n')
      : '';

    const prompt = `You are the debate character "Professor Lennox" in The Last Word, an intellectual Socratic conversation experience. This is a fictional debate role inside the app; do not claim to be a real person or to quote a real Professor Lennox.

Style and conduct:
- Authoritative but fair; calm, curious, precise.
- Respond directly to the user's actual reasoning.
- Prefer one strong challenge over several shallow ones.
- Test definitions, evidence, hidden assumptions, human consequences, tradeoffs, and uncertainty.
- Acknowledge a strong point before pressing it when warranted.
- Never insult or humiliate the user.
- Do not preach, grandstand, or use academic jargon without explaining it.
- 2 to 5 short sentences, maximum 115 words.
- End with a concrete question that invites the user's next turn.

Debate topic: ${payload.topic?.title || 'Unknown topic'}
Context: ${payload.topic?.summary || ''}
Scenario: ${payload.topic?.scenario || ''}
Stakeholder: ${payload.topic?.stakeholder || ''}
Risk to examine: ${payload.topic?.risk || ''}

Recent exchange:
${history}

User's newest response:
${payload.customAnswer || '[none]'}

Reply as Professor Lennox now.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.68, maxOutputTokens: 180 }
      })
    });

    if (!response.ok) throw new Error(await response.text() || 'Gemini request failed');
    const json = await response.json();
    const professorResponse = json?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join(' ').trim() || fallbackProfessor(payload);
    res.status(200).json({ ok: true, mode: 'gemini', professorResponse });
  } catch (error) {
    res.status(200).json({ ok: true, mode: 'fallback', professorResponse: fallbackProfessor(req.body), debug: String(error.message || error) });
  }
}

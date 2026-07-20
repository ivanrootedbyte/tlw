const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

function fallbackProfessor(payload) {
  const card = payload?.card?.name || 'that move';
  const custom = (payload?.customAnswer || '').trim();
  if (custom) {
    return `You played ${card}. Your custom line tried to do too much at once. Tighten the claim, define one key term, and leave less room for theatrical escape.`;
  }
  return `You played ${card}. Interesting energy. Now provide the missing bridge between capability, meaning, and moral authority.`;
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

    const prompt = `You are Professor L in a retro debate game. Respond in 1 to 3 sentences, under 70 words, witty but rigorous, never preachy, never impersonating a real person.
Topic: ${payload.topic?.title || 'Unknown topic'}
Round: ${payload.round?.title || 'Unknown round'}
Round challenge: ${payload.round?.challenge || ''}
Player persona: ${payload.persona?.displayName || payload.persona?.safeName || 'Unknown persona'}
Selected card: ${payload.card?.name || 'Unknown card'}
Card text: ${payload.card?.text || ''}
Scores now: logic ${payload.scores?.logic ?? 'n/a'}, evidence ${payload.scores?.evidence ?? 'n/a'}, humanity ${payload.scores?.humanity ?? 'n/a'}, humility ${payload.scores?.humility ?? 'n/a'}
Player custom line: ${payload.customAnswer || '[none]'}
Write a pointed cross-examination or verdict line. If the player dodged, say so crisply. If they admitted uncertainty, reward honesty. Avoid brand names and avoid legal-risk references.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 120
        }
      })
    });

    if (!response.ok) {
      const txt = await response.text();
      throw new Error(txt || 'Gemini request failed');
    }

    const json = await response.json();
    const professorResponse = json?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join(' ').trim() || fallbackProfessor(payload);
    res.status(200).json({ ok: true, mode: 'gemini', professorResponse });
  } catch (error) {
    res.status(200).json({ ok: true, mode: 'fallback', professorResponse: fallbackProfessor(req.body), debug: String(error.message || error) });
  }
}

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

function fallbackProfessor(payload) {
  const card = payload?.card?.name || 'that move';
  const custom = (payload?.customAnswer || '').trim();
  if (custom) {
    return `You played ${card}. Your line has energy. Now make it clearer, prove one thing, and stop giving the question somewhere to hide.`;
  }
  return `You played ${card}. Good move. Now show the missing step between what sounds useful and what is actually right.`;
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

    const prompt = `You are Professor L in a retro debate card game. Use plain language that a smart teenager can understand.
Rules:
- 1 to 3 short sentences, max 70 words.
- Witty, direct, and clear.
- No academic jargon unless you immediately explain it.
- Do not preach.
- Do not impersonate a real person.
- If the player dodged, call it out.
- If the player was honest, praise it.
- Keep the focus on truth, proof, people, and honest thinking.

Topic: ${payload.topic?.title || 'Unknown topic'}
Category: ${payload.topic?.categoryLabel || payload.topic?.category || 'Unknown'}
Round: ${payload.round?.title || 'Unknown round'}
Round challenge: ${payload.round?.challenge || ''}
Player persona: ${payload.persona?.displayName || payload.persona?.safeName || 'Unknown persona'}
Selected card: ${payload.card?.name || 'Unknown card'}
Card text: ${payload.card?.text || ''}
Scores now: logic ${payload.scores?.logic ?? 'n/a'}, proof ${payload.scores?.evidence ?? 'n/a'}, people ${payload.scores?.humanity ?? 'n/a'}, honesty ${payload.scores?.humility ?? 'n/a'}
Player custom line: ${payload.customAnswer || '[none]'}

Write Professor L's response now.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.75, maxOutputTokens: 120 }
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

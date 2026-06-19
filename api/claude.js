export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || process.env.VITE_CLAUDE_API_KEY;
  const CLAUDE_API_URL = process.env.CLAUDE_API_URL || process.env.VITE_CLAUDE_API_URL || 'https://api.anthropic.com/v1/messages';

  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Missing CLAUDE_API_KEY or VITE_CLAUDE_API_KEY environment variable' });
  }

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      return res.status(502).json({ error: 'Claude proxy returned invalid JSON', body: text });
    }

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Claude proxy error:', error);
    return res.status(502).json({ error: 'Failed to call Claude API', message: error.message });
  }
}

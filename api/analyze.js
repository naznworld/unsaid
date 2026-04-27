const ipMap = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Rate limiting: IP당 하루에 3회 ──
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  const now = Date.now();
  const record = ipMap.get(ip) || { count: 0, resetAt: now + 86_400_000 };

  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + 86_400_000;
  }

  record.count++;
  ipMap.set(ip, record);

  if (record.count > 3) {
    return res.status(429).json({ error: '오늘은 이미 충분히 꺼냈어요 🙏 내일 다시 만나요.' });
  }

  // ── Anthropic API 호출 ──
  try {
    const body = await req.json ? req.json() : req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return res.status(response.status).json(data);

  } catch (error) {
    return res.status(500).json({ error: '서버 오류가 발생했어요.' });
  }
}

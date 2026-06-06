module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.AI_API_KEY;

  res.status(200).json({
    status: 'ok',
    ai: apiKey ? 'connected' : 'offline',
    model: process.env.AI_MODEL || 'qwen-plus',
    hasApiKey: !!apiKey,
    env: process.env.NODE_ENV || 'production'
  });
};

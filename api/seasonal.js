const { callLLM } = require('./_shared');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const { season, weather, time } = req.body;
    const PROMPT = `你是「留白」的节气/天气关怀生成器。规则：用一句简短的话（不超过 20 字）给出温暖的关怀。不要分析、不要给建议。语气像朋友随口说的一句话。`;

    const userPrompt = `当前节气/时间：${season || '未知'}\n天气：${weather || '未知'}\n时间：${time || '未知'}`;
    const text = await callLLM(PROMPT, userPrompt);

    res.status(200).json({ text: text.replace(/^ACTION:.*/m, '').trim() });
  } catch (e) {
    console.error('[API Error] seasonal:', e);
    res.status(500).json({ error: '服务器内部错误' });
  }
};

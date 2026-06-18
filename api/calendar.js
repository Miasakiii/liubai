const { callLLM } = require('./_shared');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const { month, records, totalDays } = req.body;
    const PROMPT = `你是「留白」的月度回顾生成器。你的性格：像一个安静的朋友，在月底给你写一封信。不分析、不评判、不给建议。用短句，像发微信。可以温柔、可以幽默、可以诗意，但不要鸡汤。不要用感叹号。不要用"数据显示""根据你的记录"这类句式。`;

    const userPrompt = `用户 ${month} 月情绪记录：\n${records}\n记录天数：${totalDays} 天\n\n请生成月度回顾。`;
    const text = await callLLM(PROMPT, userPrompt);

    res.status(200).json({ text: text.replace(/^ACTION:.*/m, '').trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const { callLLM } = require('./_shared');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const { records } = req.body;
    const moodEmojis = { great: '😊', good: '🙂', neutral: '😐', low: '😔', bad: '😫', skip: '🌙' };
    const days = ['周一','周二','周三','周四','周五','周六','周日'];
    const recordStr = records.map((r, i) => `${days[i]}：${moodEmojis[r] || '·'}`).join(' | ');
    const recordDays = records.filter(r => r).length;

    const PROMPT = `你是「留白」的周报生成器。规则：不要分析数据、不要给建议、不要评判。用一段话（3-5 句）概括这一周的情绪。语气像朋友发的微信。结尾给一句安静的力量。不要用感叹号。`;

    const userPrompt = `本周情绪记录：${recordStr}\n记录天数：${recordDays}/7`;
    const text = await callLLM(PROMPT, userPrompt);

    res.status(200).json({ text: text.replace(/^ACTION:.*/m, '').trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

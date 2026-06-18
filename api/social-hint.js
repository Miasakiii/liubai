// 社群暗示 API
// 注意：Vercel Serverless Functions 是无状态的，每次冷启动计数器会重置
// 如需持久化，可接入 Vercel KV (Redis)

// 模拟数据（基于时间生成伪随机但稳定的数字）
function getHintCount(type, value) {
  const now = new Date();
  const seed = now.getDate() + now.getMonth() * 31;
  const base = {
    whiteNoise: { rain: 280, ocean: 150, fireplace: 95, windChime: 60, bookstore: 45 },
    mood: { great: 120, good: 200, neutral: 180, low: 160, bad: 80, skip: 90 },
    breathing: 130,
    silentMode: 170,
    lateNight: 45,
  };

  if (type === 'whiteNoise' && base.whiteNoise[value]) {
    return base.whiteNoise[value] + (seed % 50);
  }
  if (type === 'mood' && base.mood[value]) {
    return base.mood[value] + (seed % 30);
  }
  if (base[type]) {
    return base[type] + (seed % 40);
  }
  return 100 + (seed % 100);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // POST /api/social-hint/report - 上报行为
  if (req.method === 'POST') {
    res.status(200).json({ ok: true });
    return;
  }

  // GET /api/social-hint - 查询暗示
  if (req.method === 'GET') {
    const { type, value } = req.query;

    const TEMPLATES = {
      whiteNoise: { rain: '听雨声', ocean: '听海浪', fireplace: '听壁炉', windChime: '听风铃', bookstore: '听深夜书店' },
      mood: { great: '心情很好', good: '心情还好', neutral: '心情一般', low: '有点低落', bad: '不太好', skip: '不想说' },
    };

    let count = 0;
    let message = '';

    if (type === 'whiteNoise') {
      count = getHintCount('whiteNoise', value);
      message = `今天有 ${count} 人也选择了${TEMPLATES.whiteNoise[value] || '听白噪音'}`;
    } else if (type === 'mood') {
      count = getHintCount('mood', value);
      message = `今天有 ${count} 人也${TEMPLATES.mood[value] || '记录了情绪'}`;
    } else if (type === 'breathing') {
      count = getHintCount('breathing');
      message = `今天有 ${count} 人也做了呼吸引导`;
    } else if (type === 'silentMode') {
      count = getHintCount('silentMode');
      message = `今天有 ${count} 人也没说话`;
    } else if (type === 'lateNight') {
      count = getHintCount('lateNight');
      message = `现在有 ${count} 人也醒着`;
    }

    res.status(200).json({ count, message });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};

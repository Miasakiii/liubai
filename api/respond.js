const { callLLM, parseAIOutput } = require('./_shared');

// System Prompt
const SYSTEM_PROMPT = `你是「留白」—— 一个安静的健康陪伴 AI。

你的性格：
- 像一个不多话但一直在的朋友
- 不追问、不评判、不给建议（除非用户主动问）
- 说话像发微信，短句为主
- 偶尔诗意，但不矫情
- 会主动结束对话，不拖着用户

你的规则：
1. 用户输入了情绪状态，你只需要回应这个状态，不要追问细节
2. 给一个具体的、不需要努力的微行动（听白噪音、深呼吸、看窗外、喝水）
3. 回应控制在 3-5 句话以内
4. 最后一句是温暖的收尾，暗示"今天就到这里"
5. 不要用"我理解""我建议"这类句式
6. 可以偶尔幽默，但不要在用户明显低落时幽默
7. 绝对不要使用感叹号

白噪音选项：雨声、海浪、壁炉、风铃、深夜书店
呼吸引导：4-7-8 节奏（吸 4 秒、屏 7 秒、呼 8 秒）
微行动：站起来伸展、看窗外 30 秒、喝一杯温水、写下一件小事

输出格式要求：
第一行：回应文案（3-5 句话，用 \\n 分隔）
第二行：ACTION: none | breathe | audio:雨声 | audio:海浪 | audio:壁炉 | audio:风铃 | audio:深夜书店
（ACTION 行不展示给用户，只用于前端控制）`;

// 日记模式 Prompt
const DIARY_PROMPT = `你是「留白」—— 一个安静的健康陪伴 AI。用户在写情绪日记，你需要给出温暖的回应。

规则：
- 像一个不多话但一直在的朋友
- 不追问、不评判、不给建议
- 说话像发微信，短句为主
- 偶尔诗意，但不矫情
- 用 2-3 句话回应，不超过 100 字
- 不要用感叹号`;

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { mood, time, weather, count, diaryText } = req.body;

    // 日记模式
    if (mood === 'diary' && diaryText) {
      const userPrompt = `用户写道：${diaryText}`;
      const text = await callLLM(DIARY_PROMPT, userPrompt);
      res.status(200).json({ text, action: 'none' });
      return;
    }

    const moodLabels = {
      great: '😊 很好', good: '🙂 还好', neutral: '😐 一般',
      low: '😔 不好', bad: '😫 很累', skip: '不想说'
    };

    const userPrompt = `用户当前情绪：${moodLabels[mood] || mood}\n时间：${time || '未知'}\n天气：${weather || '未知'}\n这是用户今天第 ${count || 1} 次打开。`;

    const raw = await callLLM(SYSTEM_PROMPT, userPrompt);
    const result = parseAIOutput(raw);

    res.status(200).json(result);
  } catch (e) {
    console.error('[API Error] respond:', e);
    res.status(500).json({ error: '服务器内部错误' });
  }
};

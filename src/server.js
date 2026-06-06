const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');

// 加载 .env 配置
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && !key.startsWith('#')) {
        const value = valueParts.join('=').trim();
        if (value && !process.env[key.trim()]) {
          process.env[key.trim()] = value;
        }
      }
    });
  }
}
loadEnv();

const PORT = 3001;

// ============ AI 配置 ============
// 支持 OpenAI 兼容 API（通义千问、GPT、DeepSeek 等）
const AI_CONFIG = {
  // 通义千问 API（免费额度，推荐）
  baseUrl: process.env.AI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: process.env.AI_API_KEY || '',
  model: process.env.AI_MODEL || 'qwen-plus',
};

// ============ System Prompts ============
const PROMPTS = {
  response: `你是「留白」—— 一个安静的健康陪伴 AI。

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
（ACTION 行不展示给用户，只用于前端控制）`,

  weekly: `你是「留白」的周报生成器。

规则：
1. 不要分析数据、不要给建议、不要评判
2. 用一段话（3-5 句）概括这一周的情绪
3. 语气像朋友发的微信，不是医生的报告
4. 可以温柔、可以幽默、可以诗意，但不要鸡汤
5. 结尾给一句安静的力量
6. 不要用"数据显示""根据你的记录"这类句式
7. 绝对不要使用感叹号`,

  calendar: `你是「留白」的情绪日历总结器。

规则：
1. 根据一个月的情绪记录，生成一段总结
2. 不要统计分析，不要百分比
3. 用温暖的语言，像回忆一个朋友的月度故事
4. 突出好的日子，轻描淡写不好的日子
5. 结尾给一句安静的力量
6. 绝对不要使用感叹号`,

  seasonal: `你是「留白」的节气文案生成器。

规则：
1. 结合当前节气/天气/时间，生成一句安静的关怀
2. 不要科普节气知识
3. 控制在 1-2 句话
4. 像一条安静的朋友圈，不是养生公众号
5. 绝对不要使用感叹号`
};

// ============ 调用 LLM API ============
function callLLM(systemPrompt, userPrompt) {
  return new Promise((resolve, reject) => {
    if (!AI_CONFIG.apiKey) {
      // 无 API Key 时使用离线回应
      resolve(getOfflineResponse(userPrompt));
      return;
    }

    const url = new URL(AI_CONFIG.baseUrl + '/chat/completions');
    const postData = JSON.stringify({
      model: AI_CONFIG.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const protocol = url.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.choices && json.choices[0]) {
            resolve(json.choices[0].message.content);
          } else {
            resolve(getOfflineResponse(userPrompt));
          }
        } catch (e) {
          resolve(getOfflineResponse(userPrompt));
        }
      });
    });

    req.on('error', () => resolve(getOfflineResponse(userPrompt)));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(getOfflineResponse(userPrompt));
    });
    req.write(postData);
    req.end();
  });
}

// ============ 离线回应库 ============
const OFFLINE_RESPONSES = {
  great: [
    { text: '嘿，看起来今天状态不错。\n\n趁着心情好，出门走走吧。不用走远，楼下的风就够。\n\n好天气别浪费。去吧。', action: 'none' },
    { text: '嗯，今天挺好。\n\n把这个感觉记住。下次不好的时候，想想今天。\n\n好了，去做你的事吧。', action: 'none' },
    { text: '难得的好日子。\n\n给自己倒杯喜欢的，不为什么，就为今天。\n\n明天见。', action: 'audio:风铃' }
  ],
  good: [
    { text: '还好就好。\n\n去接杯水吧。站着喝，别坐着。\n\n就这样。下午见。', action: 'none' },
    { text: '不好不坏，也是一种不错。\n\n站起来伸个懒腰，把肩膀松一松。\n\n够了，去忙吧。', action: 'none' }
  ],
  neutral: [
    { text: '不说话也没关系。\n\n我帮你留了一段安静。90 秒，什么都不用做。\n\n听就行。', action: 'audio:雨声' },
    { text: '不想说就不说。\n\n深呼吸三次，跟着节奏：吸……屏住……呼。\n\n好了，今天的沉默就留在这里。', action: 'breathe' }
  ],
  low: [
    { text: '嗯，不太好也没关系。\n\n不用解释原因。\n\n我帮你留了一段雨声。90 秒，什么都不用做，听就行。', action: 'audio:雨声' },
    { text: '今天有点沉吧。\n\n站起来走到窗边，看 30 秒远处。我等你。\n\n回来了？嗯，今天的"不好"就留在这里。明天见。', action: 'none' }
  ],
  bad: [
    { text: '今天挺累的吧。\n\n别撑了。深呼吸三次，跟着这个节奏：吸……屏住……呼。\n\n做完就去休息。明天的事明天再说。晚安。', action: 'breathe' },
    { text: '嗯，我看到了。\n\n不需要解释，不需要坚强。\n\n听一段海浪声吧。什么都不用想。90 秒就好。', action: 'audio:海浪' }
  ],
  skip: [
    { text: '好的，不说也行。\n\n今天就安静待一会儿。\n\n我在这里，不走。明天见。', action: 'none' },
    { text: '嗯。\n\n有时候什么都不想说，就是一种回答。\n\n去忙你的吧。', action: 'none' }
  ]
};

function getOfflineResponse(userPrompt) {
  // 从 user prompt 中提取情绪
  const moodMatch = userPrompt.match(/情绪[：:]\s*(\w+)/);
  const mood = moodMatch ? moodMatch[1] : 'neutral';
  const list = OFFLINE_RESPONSES[mood] || OFFLINE_RESPONSES.neutral;
  const pick = list[Math.floor(Math.random() * list.length)];
  return pick.text + '\nACTION: ' + pick.action;
}

// ============ 解析 AI 输出 ============
function parseAIOutput(raw) {
  const lines = raw.trim().split('\n');
  let action = 'none';
  let textLines = [];

  for (const line of lines) {
    const actionMatch = line.match(/^ACTION:\s*(.+)/);
    if (actionMatch) {
      action = actionMatch[1].trim();
    } else {
      textLines.push(line);
    }
  }

  return {
    text: textLines.join('\n').trim(),
    action: action
  };
}

// ============ HTTP 服务 ============
const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/respond') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { mood, time, weather, count } = JSON.parse(body);

        const moodLabels = {
          great: '😊 很好', good: '🙂 还好', neutral: '😐 一般',
          low: '😔 不好', bad: '😫 很累', skip: '不想说'
        };

        const userPrompt = `用户当前情绪：${moodLabels[mood] || mood}\n时间：${time || '未知'}\n天气：${weather || '未知'}\n这是用户今天第 ${count || 1} 次打开。`;

        const raw = await callLLM(PROMPTS.response, userPrompt);
        const result = parseAIOutput(raw);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/weekly') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { records } = JSON.parse(body);
        const moodEmojis = {
          great: '😊', good: '🙂', neutral: '😐', low: '😔', bad: '😫', skip: '🌙'
        };
        const days = ['周一','周二','周三','周四','周五','周六','周日'];
        const recordStr = records.map((r, i) => `${days[i]}：${moodEmojis[r] || '·'}`).join(' | ');
        const recordDays = records.filter(r => r).length;

        const userPrompt = `本周情绪记录：${recordStr}\n记录天数：${recordDays}/7`;
        const text = await callLLM(PROMPTS.weekly, userPrompt);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ text: text.replace(/^ACTION:.*/m, '').trim() }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/seasonal') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { season, weather, time } = JSON.parse(body);
        const userPrompt = `当前节气/时间：${season || '未知'}\n天气：${weather || '未知'}\n时间：${time || '未知'}`;
        const text = await callLLM(PROMPTS.seasonal, userPrompt);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ text: text.replace(/^ACTION:.*/m, '').trim() }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 健康检查
  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      ai: AI_CONFIG.apiKey ? 'connected' : 'offline',
      model: AI_CONFIG.model
    }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`[留白] 后端服务已启动: http://localhost:${PORT}`);
  console.log(`[留白] AI 状态: ${AI_CONFIG.apiKey ? '已连接 (' + AI_CONFIG.model + ')' : '离线模式（使用内置回应库）'}`);
  if (!AI_CONFIG.apiKey) {
    console.log('[留白] 提示: 设置 AI_API_KEY 环境变量可启用真实 AI 回应');
    console.log('  export AI_API_KEY=your-api-key');
    console.log('  export AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1');
    console.log('  export AI_MODEL=qwen-plus');
  }
});

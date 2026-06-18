const https = require('https');

// AI 配置
const AI_CONFIG = {
  baseUrl: process.env.AI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: process.env.AI_API_KEY || '',
  model: process.env.AI_MODEL || 'qwen-plus',
};

// 离线回应库（统一数据源）
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
    { text: '今天有点沉吧。\n\n站起来走到窗边，看 30 秒远处。我等你。\n\n回来了？嗯，今天的"不好"就留在这里。明天见。', action: 'none' },
    { text: '如果今天很难，那就只管今天。\n\n不用想明天。先喝杯水，然后把今天过完。\n\n我在这里。', action: 'audio:壁炉' }
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

// 获取离线回应
function getOfflineResponse(mood) {
  const list = OFFLINE_RESPONSES[mood] || OFFLINE_RESPONSES.neutral;
  const pick = list[Math.floor(Math.random() * list.length)];
  return pick.text + '\nACTION: ' + pick.action;
}

// 解析 AI 输出
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

// 调用 LLM API（带离线降级）
function callLLM(systemPrompt, userPrompt, options = {}) {
  const { maxTokens = 300, temperature = 0.7, timeout = 8000 } = options;

  return new Promise((resolve) => {
    if (!AI_CONFIG.apiKey) {
      resolve(getOfflineResponse(userPrompt));
      return;
    }

    const url = new URL(AI_CONFIG.baseUrl + '/chat/completions');
    const body = JSON.stringify({
      model: AI_CONFIG.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      max_tokens: maxTokens
    });

    const reqOptions = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(reqOptions, (res) => {
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
    req.setTimeout(timeout, () => {
      req.destroy();
      resolve(getOfflineResponse(userPrompt));
    });
    req.write(body);
    req.end();
  });
}

module.exports = {
  AI_CONFIG,
  OFFLINE_RESPONSES,
  getOfflineResponse,
  parseAIOutput,
  callLLM
};

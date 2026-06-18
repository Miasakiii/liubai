const https = require('https');

const AI_CONFIG = {
  baseUrl: process.env.AI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: process.env.AI_API_KEY || '',
  model: process.env.AI_MODEL || 'qwen-plus',
};

function callLLM(systemPrompt, userPrompt) {
  return new Promise((resolve, reject) => {
    if (!AI_CONFIG.apiKey) {
      reject(new Error('No API key'));
      return;
    }

    const url = new URL(AI_CONFIG.baseUrl + '/chat/completions');
    const body = JSON.stringify({
      model: AI_CONFIG.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 300,
      temperature: 0.8,
    });

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.choices && json.choices[0]) {
            resolve(json.choices[0].message.content);
          } else {
            reject(new Error('Invalid response'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

module.exports = { callLLM, AI_CONFIG };

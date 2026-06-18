const https = require('https');

// 天气缓存（Serverless 函数冷启动间不共享，但减少重复请求）
let weatherCache = { data: null, ts: 0 };
const CACHE_TTL = 30 * 60 * 1000;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    // 检查缓存
    if (weatherCache.data && (Date.now() - weatherCache.ts) < CACHE_TTL) {
      res.status(200).json(weatherCache.data);
      return;
    }

    const apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey) {
      res.status(200).json({ text: '', temp: '', city: '' });
      return;
    }

    // 获取位置（使用和风天气 IP 定位）
    const geoData = await fetchJSON(`https://geoapi.qweather.com/v2/city/lookup?location=ip&key=${apiKey}`);
    if (!geoData || !geoData.location || !geoData.location[0]) {
      res.status(200).json({ text: '', temp: '', city: '' });
      return;
    }

    const city = geoData.location[0].name;
    const locationId = geoData.location[0].id;

    // 获取天气
    const weatherData = await fetchJSON(`https://devapi.qweather.com/v7/weather/now?location=${locationId}&key=${apiKey}`);
    if (!weatherData || !weatherData.now) {
      res.status(200).json({ text: '', temp: '', city: '' });
      return;
    }

    const result = {
      text: weatherData.now.text,
      temp: weatherData.now.temp,
      city: city
    };

    weatherCache = { data: result, ts: Date.now() };
    res.status(200).json(result);
  } catch (e) {
    res.status(200).json({ text: '', temp: '', city: '' });
  }
};

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

import { API_BASE } from './config.js';
import { getRecords, today, todayCount, getMonthlyReviewData, saveMonthlyReviewData } from './storage.js';
import { MOOD, OFFLINE_RESPONSES } from './data.js';
import { isGoodnightEnabled, isGoodnightTime } from './ui.js';

// ============ 离线回应 ============
export function getOfflineData(mood) {
  let list = OFFLINE_RESPONSES[mood] || OFFLINE_RESPONSES.neutral;
  if (isGoodnightEnabled() && isGoodnightTime() && ['low', 'bad', 'neutral'].includes(mood)) {
    const withAudio = list.filter(r => r.action && r.action !== 'none');
    if (withAudio.length > 0) list = withAudio;
  }
  const pick = list[Math.floor(Math.random() * list.length)];
  return { text: pick.text, action: pick.action };
}

// ============ 天气 ============
export async function fetchWeather() {
  try {
    const cached = localStorage.getItem('liubai_weather');
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < 30 * 60 * 1000 && data && data.text) return data;
    }

    const resp = await fetch(API_BASE + '/api/weather', { signal: AbortSignal.timeout(3000) });
    const data = await resp.json();
    if (data && data.text) {
      localStorage.setItem('liubai_weather', JSON.stringify({ data, ts: Date.now() }));
      return data;
    }
    return null;
  } catch { return null; }
}

// ============ AI 响应 ============
export async function fetchAIResponse(mood) {
  try {
    const now = new Date();
    const timeStr = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');

    const weather = await fetchWeather();
    const weatherStr = weather ? `${weather.text} ${weather.temp}°C` : '';
    const goodnight = isGoodnightEnabled() && isGoodnightTime();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const resp = await fetch(API_BASE + '/api/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mood,
        time: goodnight ? timeStr + '（深夜，优先推荐休息）' : timeStr,
        weather: weatherStr,
        count: todayCount()
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return await resp.json();
  } catch (e) {
    return null;
  }
}

// ============ 显示回应（主入口） ============
export function showResponse(mood) {
  const emoji = MOOD[mood]?.e || '🌙';
  document.getElementById('respEmoji').textContent = emoji;
  document.getElementById('respText').innerHTML = '';

  document.getElementById('breathGuide').classList.remove('active');
  document.getElementById('breathSelector').classList.remove('active');
  document.getElementById('playerCard').classList.remove('active');
  document.getElementById('songCard').classList.remove('active');

  // 立即显示响应页面
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-response').classList.add('active');

  // AI 已连接时：先显示加载状态，等 AI 响应后直接显示
  if (window._aiStatus !== 'offline') {
    document.getElementById('respText').innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';

    fetchAIResponse(mood).then(result => {
      if (result && result.text) {
        renderAIResponse(result.text, result.action, emoji);
      } else {
        const offlineData = getOfflineData(mood);
        renderAIResponse(offlineData.text, offlineData.action, emoji);
      }
    }).catch(() => {
      const offlineData = getOfflineData(mood);
      renderAIResponse(offlineData.text, offlineData.action, emoji);
    });
  } else {
    // 离线模式：直接显示离线响应
    const offlineData = getOfflineData(mood);
    renderAIResponse(offlineData.text, offlineData.action, emoji);
  }
}

// ============ 渲染 AI 回应 ============
export function renderAIResponse(text, action, emoji) {
  const textEl = document.getElementById('respText');
  const lines = text.split('\n').filter(l => l.trim());
  const favText = lines.join('\n');
  const fav = isFavoritedSync(favText);
  textEl.innerHTML = lines.map((l, i) =>
    `<div class="resp-line" style="animation-delay:${0.4 + i * 0.7}s">${l}</div>`
  ).join('') + `<button class="resp-fav-btn ${fav ? 'active' : ''}" style="animation-delay:${0.4 + lines.length * 0.7}s" onclick="favResponse(this)">${fav ? '❤️ 已收藏' : '♡ 喜欢'}</button>`;

  window._currentRespText = favText;
  // handleAction 由 app.js 通过全局引用调用
  if (window._handleAction) window._handleAction(action);
  // showSongCard 由 app.js 通过全局引用调用
  if (window._showSongCard) window._showSongCard();

  // 社群暗示
  if (window._currentMood === 'skip') {
    setTimeout(() => {
      if (window._triggerSocialHint) window._triggerSocialHint('silentMode');
    }, 2000);
  }
}

function isFavoritedSync(text) {
  try {
    const favs = JSON.parse(localStorage.getItem('liubai_favorites')) || [];
    return favs.some(f => f.text === text);
  } catch { return false; }
}

export function favResponse(btn) {
  const text = window._currentRespText || '';
  let favs;
  try { favs = JSON.parse(localStorage.getItem('liubai_favorites')) || []; }
  catch { favs = []; }
  const idx = favs.findIndex(f => f.text === text);
  if (idx >= 0) {
    favs.splice(idx, 1);
    btn.className = 'resp-fav-btn';
    btn.textContent = '♡ 喜欢';
  } else {
    favs.unshift({ text, date: today() });
    btn.className = 'resp-fav-btn active';
    btn.textContent = '❤️ 已收藏';
  }
  localStorage.setItem('liubai_favorites', JSON.stringify(favs));
}

// ============ 月度回顾 ============
export function openMonthlyReview() {
  const overlay = document.getElementById('monthlyOverlay');
  const contentEl = document.getElementById('monthlyContent');
  const titleEl = document.getElementById('monthlyTitle');
  const subEl = document.getElementById('monthlySub');

  const now = new Date();
  const months = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  const monthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  titleEl.textContent = months[now.getMonth()];
  subEl.textContent = '你的留白小记';

  const cache = getMonthlyReviewData();
  if (cache[monthKey]) {
    contentEl.textContent = cache[monthKey];
    overlay.classList.add('active');
    return;
  }

  contentEl.innerHTML = '<div class="monthly-loading">正在生成…</div>';
  overlay.classList.add('active');

  const records = getRecords();
  const monthRecs = Object.entries(records)
    .filter(([k]) => k.startsWith(monthKey))
    .sort(([a], [b]) => a.localeCompare(b));

  const total = monthRecs.length;
  const good = monthRecs.filter(([,r]) => ['great','good'].includes(r.mood)).length;
  const bad = monthRecs.filter(([,r]) => ['low','bad'].includes(r.mood)).length;
  const neutral = monthRecs.filter(([,r]) => ['neutral','skip'].includes(r.mood)).length;

  const moodMap = { great: '😊', good: '🙂', neutral: '😐', low: '😔', bad: '😫', skip: '😶' };
  const moodStr = monthRecs.map(([,r]) => moodMap[r.mood] || '·').join('');

  let offlineText = '';
  if (total === 0) {
    offlineText = '这个月还没有记录。\n\n没关系，慢慢来。\n\n下个月见。';
  } else if (good > total * 0.6) {
    offlineText = `这个月你来了 ${total} 天。\n\n有 ${good} 天还不错，看得出来心情挺好的。\n\n继续保持。\n\n下个月见。`;
  } else if (bad > total * 0.4) {
    offlineText = `这个月你来了 ${total} 天。\n\n有 ${bad} 天不太好，但你还是来了。\n\n这本身就是一种勇气。\n\n下个月见。`;
  } else {
    offlineText = `这个月你来了 ${total} 天。\n\n有 ${good} 天还不错，有 ${bad} 天不太好，有 ${neutral} 天只是来坐坐。\n\n不管怎样，你来了。\n\n下个月见。`;
  }

  fetch(API_BASE + '/api/calendar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      month: now.getMonth() + 1,
      records: moodStr,
      totalDays: total,
    }),
  })
    .then(r => r.json())
    .then(data => {
      const text = data.text || offlineText;
      contentEl.textContent = text;
      const c = getMonthlyReviewData();
      c[monthKey] = text;
      saveMonthlyReviewData(c);
    })
    .catch(() => {
      contentEl.textContent = offlineText;
    });
}

// 自动触发：每月 1 日首次打开
export function checkMonthlyReview() {
  const now = new Date();
  if (now.getDate() !== 1) return;
  const monthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const shownKey = 'liubai_monthly_shown';
  if (localStorage.getItem(shownKey) === monthKey) return;
  localStorage.setItem(shownKey, monthKey);
  setTimeout(() => openMonthlyReview(), 1500);
}

// AI 月度回顾（日历页用）
export async function fetchMonthlyReview(monthRecs, year, month) {
  try {
    const moodEmojis = { great: '😊', good: '🙂', neutral: '😐', low: '😔', bad: '😫', skip: '🌙' };
    const records = monthRecs.map(([date, r]) => `${date.split('-')[2]}日：${moodEmojis[r.mood] || '·'}`).join(' | ');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const resp = await fetch(API_BASE + '/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, records, totalDays: monthRecs.length }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const data = await resp.json();

    if (data && data.text) {
      document.getElementById('calSummary').textContent = data.text;
    }
  } catch {
    // 保持离线总结
  }
}

// 暴露到全局供 ui.js 调用
window._fetchMonthlyReview = fetchMonthlyReview;

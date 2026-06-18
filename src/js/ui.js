import { getRecords, isFavorited, toggleFavorite, getTreeHoleData } from './storage.js';
import { MOOD, getTodayQuote, SEASONS } from './data.js';
import { renderTrends, renderPracticePage, renderDiaryList } from './features2.js';

// ============ 晚安模式 ============
export function isGoodnightTime() {
  const h = new Date().getHours();
  return h >= 22 || h < 6;
}

export function isGoodnightEnabled() {
  return localStorage.getItem('liubai_goodnight') !== 'off';
}

export function initGoodnight() {
  if (isGoodnightEnabled() && isGoodnightTime()) {
    document.body.classList.add('goodnight');
    // 更新 PWA 主题色
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = '#1a1a2e';
    const el = document.getElementById('dailyQuote');
    if (el) {
      const quotes = ['晚安。', '今天辛苦了。', '明天的事明天再说。', '晚安，照顾好自己。', '夜深了，早点休息。'];
      const idx = new Date().getDate() % quotes.length;
      el.innerHTML = `<span class="quote-text">${quotes[idx]}</span>`;
    }
  }
}

export function toggleGoodnightSetting(btn) {
  const isOn = btn.classList.toggle('on');
  localStorage.setItem('liubai_goodnight', isOn ? 'on' : 'off');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (isOn && isGoodnightTime()) {
    document.body.classList.add('goodnight');
    if (meta) meta.content = '#1a1a2e';
  } else {
    document.body.classList.remove('goodnight');
    if (meta) meta.content = '#f7f5f0';
  }
}

// ============ 页面管理 ============
export let curPage = 'home';

export function showPage(name) {
  // 切换页面时停止音频和呼吸引导
  if (window._stopAudio) window._stopAudio();
  if (window._breathTimer) { clearTimeout(window._breathTimer); window._breathTimer = null; }

  const trans = document.getElementById('pageTransition');
  trans.classList.add('active');

  setTimeout(() => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + name).classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.nav-btn[data-page="${name}"]`);
    if (btn) btn.classList.add('active');

    curPage = name;
    localStorage.setItem('liubai_current_page', name);
    if (name === 'calendar') renderCalendar();
    if (name === 'trends') renderTrends();
    if (name === 'practice') renderPracticePage();
    if (name === 'diary') renderDiaryList();

    setTimeout(() => trans.classList.remove('active'), 80);
  }, 200);
}

export function goTo(name) { showPage(name); }

export function goHome() {
  document.getElementById('breathGuide').classList.remove('active');
  document.getElementById('breathSelector').classList.remove('active');
  document.getElementById('playerCard').classList.remove('active');
  document.getElementById('songCard').classList.remove('active');
  if (window._breathTimer) clearTimeout(window._breathTimer);
  // stopAudio 由 features.js 提供，通过全局引用调用
  if (window._stopAudio) window._stopAudio();
  const quote = document.getElementById('dailyQuote');
  if (quote) quote.classList.remove('hidden');
  showPage('home');
}

// ============ 收藏列表 UI ============
export function toggleFavOverlay() {
  const overlay = document.getElementById('favOverlay');
  const isOpen = overlay.classList.contains('active');
  if (isOpen) {
    overlay.classList.remove('active');
  } else {
    renderFavorites();
    overlay.classList.add('active');
  }
}

export function renderFavorites() {
  const list = document.getElementById('favList');
  let favs;
  try { favs = JSON.parse(localStorage.getItem('liubai_favorites')) || []; }
  catch { favs = []; }

  if (favs.length === 0) {
    list.innerHTML = '<div class="fav-empty">还没有收藏。<br>看到喜欢的句子，点 ♡ 就好。</div>';
    return;
  }
  list.innerHTML = favs.map((f, i) => `
    <div class="fav-item" style="animation-delay:${i * 0.05}s">
      <div class="fav-item-text">${f.text}</div>
      <span class="fav-item-date">${f.date}</span>
      <button class="fav-item-remove" onclick="removeFav(${i})">取消收藏</button>
    </div>
  `).join('');
}

export function removeFav(index) {
  let favs;
  try { favs = JSON.parse(localStorage.getItem('liubai_favorites')) || []; }
  catch { favs = []; }
  favs.splice(index, 1);
  localStorage.setItem('liubai_favorites', JSON.stringify(favs));
  renderFavorites();
}

// ============ 日历 ============
export function renderCalendar() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const months = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];

  document.getElementById('calMonth').textContent = months[m];

  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';

  ['一','二','三','四','五','六','日'].forEach(w => {
    const el = document.createElement('div');
    el.className = 'cal-weekday';
    el.textContent = w;
    grid.appendChild(el);
  });

  const first = new Date(y, m, 1).getDay();
  const offset = first === 0 ? 6 : first - 1;
  const days = new Date(y, m + 1, 0).getDate();
  const records = getRecords();

  for (let i = 0; i < offset; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day';
    grid.appendChild(el);
  }

  for (let i = 1; i <= days; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day';
    el.style.animationDelay = `${(i + offset) * 0.02}s`;

    const key = `${y}-${String(m+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
    const rec = records[key];
    const treeData = getTreeHoleData();
    const hasTree = treeData[key] && treeData[key].length > 0;

    if (i > d) {
      el.textContent = i;
      el.classList.add('future');
    } else if (rec && MOOD[rec.mood]) {
      el.innerHTML = MOOD[rec.mood].e + (hasTree ? '<span class="tree-dot"></span>' : '');
      el.classList.add('has-data');
      if (hasTree) {
        el.style.cursor = 'pointer';
        el.onclick = () => showTreeOverlay(key);
      }
    } else {
      el.innerHTML = '<span class="dot"></span>' + (hasTree ? '<span class="tree-dot"></span>' : '');
      if (hasTree) {
        el.style.cursor = 'pointer';
        el.onclick = () => showTreeOverlay(key);
      }
    }

    if (i === d) el.classList.add('is-today');

    grid.appendChild(el);
  }

  // 总结
  const monthRecs = Object.entries(records).filter(([k]) =>
    k.startsWith(`${y}-${String(m+1).padStart(2,'0')}`)
  );
  const total = monthRecs.length;
  const good = monthRecs.filter(([,r]) => ['great','good'].includes(r.mood)).length;
  const badDays = monthRecs.filter(([,r]) => ['low','bad'].includes(r.mood)).length;
  const neutral = monthRecs.filter(([,r]) => ['neutral','skip'].includes(r.mood)).length;

  let summary = '';
  if (total === 0) {
    summary = '还没有记录。没关系，慢慢来。';
  } else {
    summary = `这个月你来了 ${total} 天。\n`;
    if (good > 0) summary += `有 ${good} 天还不错。`;
    if (badDays > 0) summary += `有 ${badDays} 天不太好。`;
    if (neutral > 0) summary += `有 ${neutral} 天只是来坐坐。`;
    summary += `\n\n但你每天都来了。这本身就是一种照顾自己。`;
    summary += `\n\n下个月见。不用更好，就这样就好。`;
  }

  // AI 已连接时：先显示加载，等 AI 响应后直接显示
  if (window._aiStatus !== 'offline' && total > 0) {
    document.getElementById('calSummary').innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
    // fetchMonthlyReview 由 ai.js 提供
    if (window._fetchMonthlyReview) {
      window._fetchMonthlyReview(monthRecs, y, m + 1);
    }
  } else {
    document.getElementById('calSummary').textContent = summary;
  }
}

// ============ 树洞查看浮层 ============
export function showTreeOverlay(dateKey) {
  const data = getTreeHoleData();
  const entries = data[dateKey];
  if (!entries || !entries.length) return;
  document.getElementById('treeOverlayTitle').textContent = `🌳 ${dateKey} 的树洞`;
  document.getElementById('treeOverlayContent').textContent = entries.map(e => e.content).join('\n\n');
  document.getElementById('treeOverlay').classList.add('active');
}

export function closeTreeOverlay(e) {
  if (e && e.target !== document.getElementById('treeOverlay')) return;
  document.getElementById('treeOverlay').classList.remove('active');
}

// ============ 月度回顾浮层 ============
export function closeMonthlyOverlay(e) {
  if (e && e.target !== document.getElementById('monthlyOverlay')) return;
  document.getElementById('monthlyOverlay').classList.remove('active');
}

// ============ AI 状态检查 ============
export async function checkAI() {
  const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? location.protocol + '//' + location.hostname + ':3001'
    : '';
  const dot = document.getElementById('aiDot');
  const label = document.getElementById('aiLabel');

  label.textContent = '离线模式';
  window._aiStatus = 'offline';

  try {
    const resp = await fetch(API_BASE + '/api/health', { signal: AbortSignal.timeout(800) });
    const data = await resp.json();
    if (data.ai === 'connected') {
      dot.classList.add('live');
      label.textContent = 'AI · ' + (data.model || '');
      window._aiStatus = 'connected';
    }
  } catch {
    // 保持离线状态
  }
}

// ============ 情绪温度计 ============
export function initMoodThermo() {
  const el = document.getElementById('moodThermo');
  if (!el) return;
  const records = getRecords();
  const now = new Date();
  const MOOD_VAL = { great: 100, good: 75, neutral: 50, low: 25, bad: 0, skip: 50 };
  let sum = 0, count = 0;

  for (let i = 0; i < 7; i++) {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - i);
    const key = dt.toISOString().slice(0, 10);
    const rec = records[key];
    if (rec && MOOD_VAL[rec.mood] !== undefined) {
      sum += MOOD_VAL[rec.mood];
      count++;
    }
  }

  if (count === 0) {
    el.classList.add('hidden');
    return;
  }

  const temp = Math.round(sum / count);
  el.textContent = `本周情绪温度 ${temp}°`;
}

// ============ 今日一句初始化 ============
export function initDailyQuote() {
  const el = document.getElementById('dailyQuote');
  if (!el) return;
  const quote = getTodayQuote();
  const fav = isFavorited(quote);
  el.innerHTML = `<span class="quote-text">${quote}</span><br><button class="fav-btn ${fav ? 'active' : ''}" onclick="favDailyQuote(this)">${fav ? '❤️ 已收藏' : '♡ 喜欢'}</button>`;
}

export function favDailyQuote(btn) {
  const quote = btn.parentElement.querySelector('.quote-text').textContent;
  const added = toggleFavorite(quote);
  btn.className = 'fav-btn' + (added ? ' active' : '');
  btn.textContent = added ? '❤️ 已收藏' : '♡ 喜欢';
}

// ============ 节气关怀 ============
export function initSeasonBar() {
  const bar = document.getElementById('seasonBar');
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();

  const key = m + '-' + d;
  const season = SEASONS[key];

  if (season) {
    bar.textContent = `🌱 ${season.name} · ${season.text}`;
    bar.style.cursor = 'pointer';
    bar.onclick = () => { bar.style.opacity = '0'; setTimeout(() => bar.style.display = 'none', 500); };
    setTimeout(() => {
      bar.style.opacity = '0';
      setTimeout(() => { bar.style.display = 'none'; }, 500);
    }, 5000);
  } else {
    bar.style.display = 'none';
  }
}

// ============ 引导关闭 ============
export function closeOnboarding() {
  document.getElementById('onboarding').classList.add('hidden');
  localStorage.setItem('liubai_onboarded', '1');
}

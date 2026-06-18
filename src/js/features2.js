import { getRecords, today } from './storage.js';
import { MOOD } from './data.js';
import { API_BASE } from './config.js';
import { escapeHtml } from './utils.js';

// ============ 情绪趋势图表 ============
const MOOD_COLORS = {
  great: '#8fbc8f',
  good: '#c4a882',
  neutral: '#9a9a9a',
  low: '#7e8cc4',
  bad: '#c47e7e',
  skip: '#c5c0b8'
};

const MOOD_VALUES = { great: 100, good: 75, neutral: 50, low: 25, bad: 0, skip: 50 };

let currentTrendsTab = 'week';

export function switchTrendsTab(tab, btn) {
  currentTrendsTab = tab;
  document.querySelectorAll('.trends-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderTrends();
}

export function renderTrends() {
  const records = getRecords();
  const now = new Date();
  let days = currentTrendsTab === 'week' ? 7 : 30;

  // 收集数据
  const moodCounts = { great: 0, good: 0, neutral: 0, low: 0, bad: 0, skip: 0 };
  const tempData = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const rec = records[key];
    if (rec && moodCounts[rec.mood] !== undefined) {
      moodCounts[rec.mood]++;
      tempData.push({ date: d, value: MOOD_VALUES[rec.mood] });
    } else {
      tempData.push({ date: d, value: null });
    }
  }

  // 渲染饼图
  renderPieChart(moodCounts);

  // 渲染折线图
  renderLineChart(tempData);

  // 渲染解读
  renderInsight(moodCounts, days);
}

function renderPieChart(counts) {
  const canvas = document.getElementById('moodPieChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = 200;
  const center = size / 2;
  const radius = 80;

  ctx.clearRect(0, 0, size, size);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) {
    ctx.fillStyle = '#e8ddd0';
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9a9a9a';
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.fillText('暂无数据', center, center + 5);
    document.getElementById('pieLegend').innerHTML = '';
    return;
  }

  let startAngle = -Math.PI / 2;
  const legendItems = [];

  for (const [mood, count] of Object.entries(counts)) {
    if (count === 0) continue;
    const sliceAngle = (count / total) * Math.PI * 2;

    ctx.fillStyle = MOOD_COLORS[mood];
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fill();

    legendItems.push(`
      <div class="legend-item">
        <span class="legend-dot" style="background:${MOOD_COLORS[mood]}"></span>
        <span>${MOOD[mood].e} ${MOOD[mood].label} ${Math.round(count / total * 100)}%</span>
      </div>
    `);

    startAngle += sliceAngle;
  }

  document.getElementById('pieLegend').innerHTML = legendItems.join('');
}

function renderLineChart(data) {
  const canvas = document.getElementById('moodLineChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = 320;
  const height = 160;
  const padding = { top: 20, right: 20, bottom: 30, left: 30 };

  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);

  const validData = data.filter(d => d.value !== null);
  if (validData.length < 2) {
    ctx.fillStyle = '#9a9a9a';
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.fillText('数据不足', width / 2, height / 2);
    return;
  }

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // 绘制网格线
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  // 绘制折线
  ctx.strokeStyle = '#c4a882';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();

  validData.forEach((d, i) => {
    const x = padding.left + (i / (validData.length - 1)) * chartW;
    const y = padding.top + chartH - (d.value / 100) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // 绘制数据点
  validData.forEach((d, i) => {
    const x = padding.left + (i / (validData.length - 1)) * chartW;
    const y = padding.top + chartH - (d.value / 100) * chartH;

    ctx.fillStyle = '#c4a882';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f7f5f0';
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // 绘制日期标签
  ctx.fillStyle = '#c5c0b8';
  ctx.font = '10px serif';
  ctx.textAlign = 'center';
  const labelStep = Math.max(1, Math.floor(validData.length / 5));
  validData.forEach((d, i) => {
    if (i % labelStep === 0 || i === validData.length - 1) {
      const x = padding.left + (i / (validData.length - 1)) * chartW;
      const label = `${d.date.getMonth() + 1}/${d.date.getDate()}`;
      ctx.fillText(label, x, height - 8);
    }
  });
}

function renderInsight(counts, days) {
  const el = document.getElementById('trendInsight');
  if (!el) return;

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) {
    el.textContent = '还没有记录。\n\n慢慢来，从今天开始。';
    return;
  }

  const good = counts.great + counts.good;
  const bad = counts.low + counts.bad;
  const period = days === 7 ? '这周' : '这个月';

  let text = `${period}你来了 ${total} 天。\n\n`;

  if (good > total * 0.6) {
    text += `有 ${good} 天心情不错，看得出来你状态挺好的。\n\n继续保持，好日子不用多。`;
  } else if (bad > total * 0.4) {
    text += `有 ${bad} 天不太好，但你还是来了。\n\n这本身就是一种勇气。`;
  } else {
    text += `有好的时候，也有不好的时候。\n\n但你每天都来了。这就是照顾自己。`;
  }

  const avgTemp = Math.round(
    Object.entries(counts).reduce((sum, [mood, c]) => sum + (MOOD_VALUES[mood] || 50) * c, 0) / total
  );

  text += `\n\n${period}的情绪温度是 ${avgTemp}°。`;

  if (avgTemp >= 70) {
    text += ' 温暖的。';
  } else if (avgTemp >= 40) {
    text += ' 不冷不热，刚刚好。';
  } else {
    text += ' 有点凉。记得多照顾自己。';
  }

  el.textContent = text;
}

// ============ 7 天留白练习 ============
const PRACTICE_DAYS = [
  {
    title: '接纳',
    desc: '今天练习：不评判自己的情绪。它来了，就让它待一会儿。',
    instruction: '闭上眼睛，深呼吸三次。\n\n感受此刻的身体状态。\n\n不要试图改变什么。\n\n就这样，待 3 分钟。',
    duration: 180
  },
  {
    title: '放下',
    desc: '今天练习：放下一件你一直在想的事。',
    instruction: '想想一件最近困扰你的事。\n\n把它想象成一片树叶。\n\n看着它随风飘走。\n\n深呼吸，放手。',
    duration: 180
  },
  {
    title: '当下',
    desc: '今天练习：只关注此刻的五感。',
    instruction: '说出你看到的 5 样东西。\n\n说出你听到的 4 种声音。\n\n说出你触摸到的 3 样东西。\n\n说出你闻到的 2 种气味。\n\n说出你尝到的 1 种味道。',
    duration: 240
  },
  {
    title: '呼吸',
    desc: '今天练习：专注呼吸，什么都不想。',
    instruction: '吸气 4 秒。\n\n屏住 7 秒。\n\n呼气 8 秒。\n\n重复 4 次。',
    duration: 300
  },
  {
    title: '感恩',
    desc: '今天练习：想三件值得感恩的小事。',
    instruction: '闭上眼睛。\n\n想一件今天发生的好事。\n\n想一个对你好的人。\n\n想一个你拥有的东西。\n\n感受这份温暖。',
    duration: 180
  },
  {
    title: '身体',
    desc: '今天练习：和身体对话。',
    instruction: '从头顶开始。\n\n慢慢感受每一个部位。\n\n头、肩膀、手臂、手指。\n\n胸腔、腹部、双腿、双脚。\n\n对每个部位说：辛苦了。',
    duration: 240
  },
  {
    title: '留白',
    desc: '今天练习：什么都不做，就待着。',
    instruction: '找一个舒服的姿势。\n\n闭上眼睛。\n\n什么都不想。\n\n什么都不做。\n\n就这样，待 5 分钟。',
    duration: 300
  }
];

let practiceTimer = null;
let practiceTimeLeft = 0;

export function renderPracticePage() {
  const container = document.getElementById('practiceDays');
  if (!container) return;

  const completed = JSON.parse(localStorage.getItem('liubai_practice') || '[]');
  const progressBar = document.getElementById('practiceProgressBar');
  const progressText = document.getElementById('practiceProgressText');

  if (progressBar) progressBar.style.width = `${(completed.length / 7) * 100}%`;
  if (progressText) progressText.textContent = `${completed.length}/7`;

  container.innerHTML = PRACTICE_DAYS.map((day, i) => {
    const isCompleted = completed.includes(i);
    return `
      <div class="practice-day-card ${isCompleted ? 'completed' : ''}" onclick="openPracticeDay(${i})">
        <div class="practice-day-num">${isCompleted ? '✓' : i + 1}</div>
        <div class="practice-day-info">
          <div class="practice-day-title">${day.title}</div>
          <div class="practice-day-desc">${day.desc}</div>
        </div>
      </div>
    `;
  }).join('');
}

export function openPracticeDay(index) {
  const day = PRACTICE_DAYS[index];
  if (!day) return;

  document.getElementById('practiceOverlayDay').textContent = `第 ${index + 1} 天`;
  document.getElementById('practiceOverlayTitle').textContent = day.title;
  document.getElementById('practiceOverlayDesc').textContent = day.instruction;
  document.getElementById('practiceOverlayTimer').classList.remove('active');
  document.getElementById('practiceOverlayTimer').textContent = formatTime(day.duration);
  document.getElementById('practiceOverlayBtn').textContent = '开始练习';
  document.getElementById('practiceOverlayBtn').onclick = () => startPracticeExercise(index);
  document.getElementById('practiceOverlay').classList.add('active');

  window._currentPracticeIndex = index;
}

export function startPracticeExercise(index) {
  const day = PRACTICE_DAYS[index !== undefined ? index : window._currentPracticeIndex];
  if (!day) return;

  const timerEl = document.getElementById('practiceOverlayTimer');
  const btnEl = document.getElementById('practiceOverlayBtn');

  timerEl.classList.add('active');
  btnEl.style.display = 'none';

  practiceTimeLeft = day.duration;
  timerEl.textContent = formatTime(practiceTimeLeft);

  if (practiceTimer) clearInterval(practiceTimer);
  practiceTimer = setInterval(() => {
    practiceTimeLeft--;
    timerEl.textContent = formatTime(practiceTimeLeft);

    if (practiceTimeLeft <= 0) {
      clearInterval(practiceTimer);
      practiceTimer = null;
      completePractice(index !== undefined ? index : window._currentPracticeIndex);
    }
  }, 1000);
}

function completePractice(index) {
  const completed = JSON.parse(localStorage.getItem('liubai_practice') || '[]');
  if (!completed.includes(index)) {
    completed.push(index);
    localStorage.setItem('liubai_practice', JSON.stringify(completed));
  }

  const timerEl = document.getElementById('practiceOverlayTimer');
  const btnEl = document.getElementById('practiceOverlayBtn');

  timerEl.textContent = '完成 ✓';
  btnEl.textContent = '返回';
  btnEl.style.display = 'block';
  btnEl.onclick = () => {
    closePracticeOverlay();
    renderPracticePage();
  };
}

export function closePracticeOverlay(e) {
  if (e && e.target !== document.getElementById('practiceOverlay')) return;
  document.getElementById('practiceOverlay').classList.remove('active');
  if (practiceTimer) {
    clearInterval(practiceTimer);
    practiceTimer = null;
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ============ 情绪日记 ============
const DIARY_KEY = 'liubai_diary';

export function getDiaryData() {
  try { return JSON.parse(localStorage.getItem(DIARY_KEY) || '[]'); }
  catch { return []; }
}

export function saveDiary() {
  const input = document.getElementById('diaryInput');
  const text = input.value.trim();
  if (!text) return;

  const wantAi = document.getElementById('diaryAiResponse').checked;
  const entries = getDiaryData();
  const entry = {
    id: Date.now(),
    date: today(),
    text: text,
    aiResponse: null,
    ts: Date.now()
  };

  entries.unshift(entry);
  localStorage.setItem(DIARY_KEY, JSON.stringify(entries));
  input.value = '';
  document.getElementById('diaryCharCount').textContent = '0';
  renderDiaryList();

  // AI 回应
  if (wantAi) {
    fetchDiaryAIResponse(entry.id, text);
  }
}

async function fetchDiaryAIResponse(entryId, text) {
  try {
    const resp = await fetch(API_BASE + '/api/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mood: 'diary',
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        weather: '',
        count: 1,
        diaryText: text
      }),
      signal: AbortSignal.timeout(5000)
    });
    const data = await resp.json();
    if (data && data.text) {
      const entries = getDiaryData();
      const entry = entries.find(e => e.id === entryId);
      if (entry) {
        entry.aiResponse = data.text;
        localStorage.setItem(DIARY_KEY, JSON.stringify(entries));
        renderDiaryList();
      }
    }
  } catch {
    // 静默失败
  }
}

export function renderDiaryList() {
  const container = document.getElementById('diaryList');
  if (!container) return;

  const entries = getDiaryData();
  if (entries.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-light);padding:40px 0;font-size:14px">还没有日记。<br>写下今天的心情吧。</div>';
    return;
  }

  container.innerHTML = entries.map((e, i) => `
    <div class="diary-item" style="animation-delay:${i * 0.05}s">
      <div class="diary-item-date">${e.date}</div>
      <div class="diary-item-text">${escapeHtml(e.text)}</div>
      ${e.aiResponse ? `<div class="diary-item-ai">${escapeHtml(e.aiResponse)}</div>` : ''}
      <div class="diary-item-actions">
        <button class="diary-delete-btn" onclick="deleteDiary(${e.id})">删除</button>
      </div>
    </div>
  `).join('');
}

export function deleteDiary(id) {
  const entries = getDiaryData().filter(e => e.id !== id);
  localStorage.setItem(DIARY_KEY, JSON.stringify(entries));
  renderDiaryList();
}

// 字数统计
export function initDiaryInput() {
  const input = document.getElementById('diaryInput');
  const counter = document.getElementById('diaryCharCount');
  if (input && counter) {
    input.addEventListener('input', () => {
      counter.textContent = input.value.length;
    });
  }
}

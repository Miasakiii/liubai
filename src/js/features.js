import { API_BASE, HINT_COUNT_KEY, HINT_DATE_KEY, SOCIAL_HINT_SETTING_KEY } from './config.js';
import { getRecords } from './storage.js';
import { BREATH_TYPES, AUDIO_URLS, AUDIO_ICONS, DRIFT_ANON_TAGS, DRIFT_CONTENT_POOL } from './data.js';
import { getDriftData, saveDriftData, getTreeHoleData, saveTreeHoleEntry, getTodayTreeHoleCount } from './storage.js';

// ============ 呼吸引导 ============
export function startBreathing() {
  document.getElementById('breathSelector').classList.add('active');
  document.getElementById('breathGuide').classList.remove('active');
}

export function startBreathingWithType(type) {
  const config = BREATH_TYPES[type];
  if (!config) return;

  document.getElementById('breathSelector').classList.remove('active');
  const guide = document.getElementById('breathGuide');
  guide.classList.add('active');

  const circle = guide.querySelector('.breath-circle');
  circle.style.animationDuration = config.circleDuration + 's';

  const label = document.getElementById('breathLabel');
  const roundsEl = document.getElementById('breathRounds');

  let phaseIndex = 0;
  let currentRound = 1;

  function tick() {
    if (phaseIndex >= config.phases.length) {
      if (currentRound >= config.rounds) {
        roundsEl.textContent = '完成';
        label.textContent = '好了';
        reportSocialHint('breathing');
        triggerSocialHint('breathing');
        return;
      }
      currentRound++;
      phaseIndex = 0;
    }

    const phase = config.phases[phaseIndex];
    label.textContent = phase.text;
    roundsEl.textContent = currentRound + ' / ' + config.rounds + ' 轮';
    phaseIndex++;

    window._breathTimer = setTimeout(tick, phase.ms);
  }

  tick();
}

// ============ 音频播放 ============
let currentAudio = null;
let audioTimer = null;
let currentAudioCtx = null;

export function startAudio(name) {
  stopAudio();

  const url = AUDIO_URLS[name] || AUDIO_URLS['雨声'];
  const audio = new Audio(url);
  audio.loop = true;
  audio.volume = 0.4;

  audio.play().catch(() => {
    startLocalAudio(name);
  });

  currentAudio = { stop: () => { try { audio.pause(); audio.currentTime = 0; } catch(e) {} } };

  let sec = 0;
  const total = 90;
  const fill = document.getElementById('playerFill');
  const timeEl = document.getElementById('playerTime');

  if (audioTimer) clearInterval(audioTimer);
  audioTimer = setInterval(() => {
    sec++;
    fill.style.width = (sec / total * 100) + '%';
    const rem = total - sec;
    timeEl.textContent = Math.floor(rem / 60) + ':' + String(rem % 60).padStart(2, '0');
    if (sec >= total) {
      stopAudio();
      reportSocialHint('whiteNoise', name);
      triggerSocialHint('whiteNoise', name);
    }
  }, 1000);
}

function startLocalAudio(name) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();
  currentAudioCtx = ctx;
  const sr = ctx.sampleRate;
  const len = sr * 4;
  const buffer = ctx.createBuffer(1, len, sr);
  const d = buffer.getChannelData(0);

  if (name === '雨声') {
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      const pink = (d[i-1] || 0) * 0.96 + w * 0.04;
      const mod = 0.85 + 0.15 * Math.sin(i / sr * 0.3);
      d[i] = pink * mod;
    }
  } else if (name === '海浪') {
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      const pink = (d[i-1] || 0) * 0.95 + w * 0.05;
      const wave = 0.5 + 0.5 * Math.sin(i / sr * 0.15 * Math.PI * 2);
      d[i] = pink * (0.3 + 0.7 * wave);
    }
  } else if (name === '壁炉') {
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      const warm = (d[i-1] || 0) * 0.93 + w * 0.07;
      const crackle = Math.random() < 0.002 ? (Math.random() * 0.6 + 0.2) : 0;
      d[i] = warm * 0.6 + crackle;
    }
  } else if (name === '风铃') {
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const chime = 0.15 * Math.sin(t * 523 * Math.PI * 2) * Math.exp(-((t % 1.3) * 3))
                  + 0.1  * Math.sin(t * 659 * Math.PI * 2) * Math.exp(-((t % 1.7) * 4))
                  + 0.08 * Math.sin(t * 784 * Math.PI * 2) * Math.exp(-((t % 2.1) * 5));
      const wind = (Math.random() * 2 - 1) * 0.02;
      d[i] = chime + wind;
    }
  } else {
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const hum = 0.08 * Math.sin(t * 100 * Math.PI * 2);
      const noise = (Math.random() * 2 - 1) * 0.015;
      const page = Math.random() < 0.0008 ? (Math.random() * 0.15 - 0.075) : 0;
      d[i] = hum + noise + page;
    }
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = name === '风铃' ? 3000 : name === '壁炉' ? 1200 : 900;

  const gain = ctx.createGain();
  gain.gain.value = name === '深夜书店' ? 0.5 : 0.35;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();

  currentAudio = { stop: () => { try { source.stop(); ctx.close(); } catch(e) {} } };
}

export function stopAudio() {
  if (currentAudio) {
    try { currentAudio.stop(); } catch(e) {}
    currentAudio = null;
  }
  if (currentAudioCtx) {
    try { currentAudioCtx.close(); } catch(e) {}
    currentAudioCtx = null;
  }
  if (audioTimer) {
    clearInterval(audioTimer);
    audioTimer = null;
  }
}

// 暴露到全局供 ui.js 的 goHome 调用
window._stopAudio = stopAudio;

export function simulatePlayer(name) {
  startAudio(name || '雨声');
}

// ============ 情绪树洞 ============
export function toggleTreeHole() {
  const box = document.getElementById('treeHoleBox');
  box.classList.toggle('active');
  if (box.classList.contains('active')) {
    document.getElementById('treeHoleText').focus();
  }
}

export function saveTreeHole() {
  const text = document.getElementById('treeHoleText').value.trim();
  if (!text) return;
  if (getTodayTreeHoleCount() >= 3) {
    document.querySelector('.tree-hole-hint').textContent = '今天已经写了 3 条了，明天再来吧';
    return;
  }
  saveTreeHoleEntry(text);
  document.getElementById('treeHoleText').value = '';
  document.getElementById('treeHoleBox').classList.remove('active');
}

export function discardTreeHole() {
  document.getElementById('treeHoleText').value = '';
  document.getElementById('treeHoleBox').classList.remove('active');
}

// ============ 漂流瓶 ============
function isDriftNewUser() {
  const records = getRecords();
  const dates = Object.keys(records).sort();
  if (dates.length === 0) return true;
  const first = new Date(dates[0]);
  const now = new Date();
  return (now - first) < 3 * 24 * 60 * 60 * 1000;
}

function getRandomDriftContent() {
  return DRIFT_CONTENT_POOL[Math.floor(Math.random() * DRIFT_CONTENT_POOL.length)];
}

function getRandomTag() {
  return DRIFT_ANON_TAGS[Math.floor(Math.random() * DRIFT_ANON_TAGS.length)];
}

export function openDriftBottle() {
  if (isDriftNewUser()) {
    alert('先用几天再来玩漂流瓶吧 🌊');
    return;
  }
  const todayStr = new Date().toISOString().slice(0, 10);
  const data = getDriftData();

  const received = data.received[todayStr] || [];
  while (received.length < 3) {
    received.push({ content: getRandomDriftContent(), tag: getRandomTag() });
  }
  data.received[todayStr] = received;
  saveDriftData(data);

  const sentToday = data.sent[todayStr];

  let html = '<div style="margin-bottom:16px">';
  received.forEach(b => {
    html += `<div style="padding:10px 14px;margin-bottom:8px;background:var(--accent-soft);border-radius:12px;font-size:14px;color:var(--text);line-height:1.6">
      ${b.content}<br><span style="font-size:11px;color:var(--text-muted)">— ${b.tag}</span>
    </div>`;
  });
  html += '</div>';

  if (sentToday) {
    html += '<div style="text-align:center;font-size:13px;color:var(--text-muted);letter-spacing:0.5px">已经扔了？明天再来。</div>';
  } else {
    html += `<div style="margin-top:12px">
      <textarea id="driftInput" maxlength="50" placeholder="写一句话，扔进海里" style="width:100%;min-height:60px;padding:10px 12px;border:1px solid var(--accent-soft);border-radius:12px;background:var(--card);color:var(--text);font-size:14px;font-family:inherit;resize:none;outline:none;line-height:1.6"></textarea>
      <div style="text-align:center;margin-top:8px"><button onclick="sendDriftBottle()" style="font-size:13px;color:var(--accent);cursor:pointer;border:none;background:none;font-family:inherit;padding:6px 16px;border-radius:10px;letter-spacing:1px">扔进海里 🌊</button></div>
    </div>`;
  }

  document.getElementById('driftContent').innerHTML = html;
  document.getElementById('driftOverlay').classList.add('active');
}

export function sendDriftBottle() {
  const input = document.getElementById('driftInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  const todayStr = new Date().toISOString().slice(0, 10);
  const data = getDriftData();
  data.sent[todayStr] = { content: text, ts: Date.now() };
  saveDriftData(data);
  openDriftBottle();
}

export function closeDriftOverlay(e) {
  if (e && e.target !== document.getElementById('driftOverlay')) return;
  document.getElementById('driftOverlay').classList.remove('active');
}

// ============ 社群暗示 ============
export function isSocialHintEnabled() {
  return localStorage.getItem(SOCIAL_HINT_SETTING_KEY) !== 'off';
}

export function toggleSocialHint(btn) {
  const isOn = btn.classList.toggle('on');
  localStorage.setItem(SOCIAL_HINT_SETTING_KEY, isOn ? 'on' : 'off');
}

function getTodayHintCount() {
  const todayStr = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem(HINT_DATE_KEY) !== todayStr) {
    localStorage.setItem(HINT_DATE_KEY, todayStr);
    localStorage.setItem(HINT_COUNT_KEY, '0');
    return 0;
  }
  return parseInt(localStorage.getItem(HINT_COUNT_KEY) || '0', 10);
}

function incrementHintCount() {
  const todayStr = new Date().toISOString().slice(0, 10);
  localStorage.setItem(HINT_DATE_KEY, todayStr);
  localStorage.setItem(HINT_COUNT_KEY, String(getTodayHintCount() + 1));
}

function isNewUserForHint() {
  const records = getRecords();
  const dates = Object.keys(records).sort();
  if (dates.length === 0) return true;
  const first = new Date(dates[0]);
  return (new Date() - first) < 3 * 24 * 60 * 60 * 1000;
}

export function isLateNight() {
  const h = new Date().getHours();
  return h >= 22 || h < 6;
}

async function fetchSocialHint(type, value) {
  try {
    const res = await fetch(`${API_BASE}/api/social-hint?type=${type}&value=${value || ''}`);
    const data = await res.json();
    return data.message || '';
  } catch {
    const count = Math.floor(Math.random() * 400) + 100;
    const TEMPLATES = {
      whiteNoise: '今天有 ' + count + ' 人也选择了听' + (value || '白噪音'),
      breathing: '今天有 ' + count + ' 人也做了呼吸引导',
      silentMode: '今天有 ' + count + ' 人也没说话',
      lateNight: '现在有 ' + count + ' 人也醒着',
    };
    return TEMPLATES[type] || '';
  }
}

export function reportSocialHint(type, value) {
  fetch(`${API_BASE}/api/social-hint/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, value }),
  }).catch(() => {});
}

function showSocialHintEl(message) {
  const old = document.querySelector('.social-hint-line');
  if (old) old.remove();
  const el = document.createElement('div');
  el.className = 'social-hint-line';
  el.style.cssText = 'font-size:13px;color:var(--text-muted);text-align:center;margin:12px 0;opacity:0;transition:opacity 0.6s;letter-spacing:0.5px';
  el.textContent = message;
  const doneBtn = document.querySelector('.done-btn');
  if (doneBtn) doneBtn.parentNode.insertBefore(el, doneBtn);
  requestAnimationFrame(() => { el.style.opacity = '1'; });
}

export async function triggerSocialHint(type, value) {
  if (!isSocialHintEnabled()) return;
  if (isNewUserForHint()) return;
  if (getTodayHintCount() >= 2) return;
  const message = await fetchSocialHint(type, value);
  if (message) {
    showSocialHintEl(message);
    incrementHintCount();
  }
}

// ============ 动作处理 ============
export function handleAction(action) {
  if (!action || action === 'none') return;

  if (action === 'breathe') {
    startBreathing();
  }

  if (action.startsWith('audio:')) {
    const name = action.split(':')[1];
    const card = document.getElementById('playerCard');
    document.getElementById('playerIcon').textContent = AUDIO_ICONS[name] || '🎵';
    document.getElementById('playerName').textContent = name;
    card.classList.add('active');
    simulatePlayer(name);
  }
}

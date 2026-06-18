import { today, saveRecord, pullFromCloud } from './storage.js';
import { initSupabase, migrateLocalToCloud } from './supabase.js';
import { MOOD, getRandomSong } from './data.js';
import {
  initGoodnight, isGoodnightEnabled, showPage, goHome, goTo, closeOnboarding,
  initSeasonBar, initDailyQuote, initMoodThermo, checkAI,
  toggleFavOverlay, renderFavorites, removeFav, favDailyQuote,
  renderCalendar, showTreeOverlay, closeTreeOverlay, closeMonthlyOverlay,
  toggleGoodnightSetting
} from './ui.js';
import {
  startBreathing, startBreathingWithType, handleAction,
  toggleTreeHole, saveTreeHole, discardTreeHole,
  openDriftBottle, sendDriftBottle, closeDriftOverlay,
  reportSocialHint, triggerSocialHint, isLateNight,
  isSocialHintEnabled, toggleSocialHint, stopAudio
} from './features.js';
import {
  showResponse, getOfflineData, fetchAIResponse, renderAIResponse,
  favResponse, openMonthlyReview, checkMonthlyReview, fetchMonthlyReview
} from './ai.js';
import {
  switchTrendsTab, renderTrends,
  renderPracticePage, openPracticeDay, startPracticeExercise, closePracticeOverlay,
  saveDiary, deleteDiary, renderDiaryList, initDiaryInput
} from './features2.js';

// ============ 暴露全局函数供 HTML onclick 使用 ============
window.selectMood = selectMood;
window.goTo = goTo;
window.goHome = goHome;
window.closeOnboarding = closeOnboarding;
window.startBreathingWithType = startBreathingWithType;
window.toggleTreeHole = toggleTreeHole;
window.saveTreeHole = saveTreeHole;
window.discardTreeHole = discardTreeHole;
window.toggleFavOverlay = toggleFavOverlay;
window.removeFav = removeFav;
window.favDailyQuote = favDailyQuote;
window.openMonthlyReview = openMonthlyReview;
window.closeMonthlyOverlay = closeMonthlyOverlay;
window.openDriftBottle = openDriftBottle;
window.sendDriftBottle = sendDriftBottle;
window.closeDriftOverlay = closeDriftOverlay;
window.closeTreeOverlay = closeTreeOverlay;
window.favResponse = favResponse;
window.toggleGoodnightSetting = toggleGoodnightSetting;
window.toggleSocialHint = toggleSocialHint;

// 新功能全局函数
window.switchTrendsTab = switchTrendsTab;
window.openPracticeDay = openPracticeDay;
window.startPracticeExercise = startPracticeExercise;
window.closePracticeOverlay = closePracticeOverlay;
window.saveDiary = saveDiary;
window.deleteDiary = deleteDiary;

// 暴露内部引用供模块间调用（避免循环依赖）
window._handleAction = handleAction;
window._showSongCard = showSongCard;
window._triggerSocialHint = triggerSocialHint;

// ============ 情绪选择 ============
function selectMood(mood, btn) {
  if (btn) {
    const rip = document.createElement('span');
    rip.className = 'ripple-effect';
    btn.appendChild(rip);
    setTimeout(() => rip.remove(), 500);
  }
  const quote = document.getElementById('dailyQuote');
  if (quote) quote.classList.add('hidden');
  window._currentMood = mood;
  saveRecord(today(), mood);
  reportSocialHint('mood', mood);
  if (mood === 'skip') {
    reportSocialHint('silentMode');
  }
  if (isLateNight()) {
    reportSocialHint('lateNight');
  }
  showResponse(mood);
}

// ============ 情绪歌单卡片 ============
function showSongCard() {
  const mood = window._currentMood || 'neutral';
  const song = getRandomSong(mood);
  const card = document.getElementById('songCard');
  document.getElementById('songName').textContent = song.name;
  document.getElementById('songArtist').textContent = song.artist;
  document.getElementById('songLink').href = `https://music.163.com/#/search/m/?s=${encodeURIComponent(song.query)}&type=1`;
  card.classList.add('active');
}

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', async () => {
  // 全局错误捕获
  window.onerror = (msg, src, line, col, err) => {
    console.warn('[留白] 错误:', msg, src, line);
    return false;
  };
  window.addEventListener('unhandledrejection', e => {
    console.warn('[留白] 未处理的 Promise:', e.reason);
  });

  // 注册 Service Worker（PWA 离线支持）
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('[留白] Service Worker 已注册'))
      .catch(err => console.warn('[留白] SW 注册失败:', err));
  }

  // iOS 音频解锁：首次触摸时创建 AudioContext
  let audioUnlocked = false;
  const unlockAudio = () => {
    if (audioUnlocked) return;
    audioUnlocked = true;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    setTimeout(() => ctx.close(), 100);
    document.removeEventListener('touchstart', unlockAudio);
    document.removeEventListener('click', unlockAudio);
  };
  document.addEventListener('touchstart', unlockAudio, { once: true });
  document.addEventListener('click', unlockAudio, { once: true });

  // 触摸反馈（震动 API）
  document.addEventListener('touchstart', (e) => {
    const btn = e.target.closest('.mood-btn, .nav-btn, .breath-option, .toggle, .skip-btn, .done-btn');
    if (btn && navigator.vibrate) navigator.vibrate(10);
  }, { passive: true });

  // 禁止下拉刷新（避免误触）
  document.body.addEventListener('touchmove', (e) => {
    if (e.target.closest('.fav-overlay, .tree-overlay-box, .monthly-box, textarea')) return;
    if (document.body.scrollTop === 0 && e.touches[0].clientY > 0) {
      // 不阻止，让原生滚动处理
    }
  }, { passive: true });

  // Capacitor 原生 App 功能
  if (window.Capacitor) {
    const { App } = window.Capacitor.Plugins;
    const { StatusBar } = window.Capacitor.Plugins;
    const { SplashScreen } = window.Capacitor.Plugins;

    // 隐藏启动画面
    if (SplashScreen) SplashScreen.hide();

    // 设置状态栏样式
    if (StatusBar) {
      StatusBar.setStyle({ style: 'LIGHT' });
      StatusBar.setBackgroundColor({ color: '#f7f5f0' });
    }

    // Android 返回按钮处理
    if (App) {
      App.addListener('backButton', ({ canGoBack }) => {
        // 关闭浮层
        const overlays = ['favOverlay', 'treeOverlay', 'driftOverlay', 'monthlyOverlay', 'practiceOverlay'];
        for (const id of overlays) {
          const el = document.getElementById(id);
          if (el && el.classList.contains('active')) {
            el.classList.remove('active');
            return;
          }
        }
        // 关闭呼吸引导
        const breathGuide = document.getElementById('breathGuide');
        if (breathGuide && breathGuide.classList.contains('active')) {
          breathGuide.classList.remove('active');
          document.getElementById('breathSelector').classList.remove('active');
          return;
        }
        // 回到首页
        const currentPage = localStorage.getItem('liubai_current_page');
        if (currentPage && currentPage !== 'home') {
          goHome();
          return;
        }
        // 在首页时退出 App
        if (App) App.exitApp();
      });
    }
  }

  // 初始化本地功能
  initGoodnight();
  checkAI();
  initSeasonBar();
  initDailyQuote();
  initMoodThermo();
  checkMonthlyReview();
  initDiaryInput();

  // 初始化设置页 toggle 状态
  const goodnightToggle = document.getElementById('goodnightToggle');
  if (goodnightToggle && isGoodnightEnabled()) goodnightToggle.classList.add('on');
  const socialHintToggle = document.getElementById('socialHintToggle');
  if (socialHintToggle && isSocialHintEnabled()) socialHintToggle.classList.add('on');

  const seen = localStorage.getItem('liubai_onboarded');
  if (seen) {
    document.getElementById('onboarding').classList.add('hidden');
  }

  // 恢复上次页面（排除首页，首页需要检查今日记录）
  const lastPage = localStorage.getItem('liubai_current_page');
  const rec = (JSON.parse(localStorage.getItem('liubai_records') || '{}'))[today()];
  if (lastPage && lastPage !== 'home' && seen) {
    showPage(lastPage);
  } else if (rec) {
    showPage('calendar');
  }

  // Supabase 云端同步
  initSupabase().then(async (ok) => {
    if (!ok) return;
    await migrateLocalToCloud();
    await pullFromCloud();
    initMoodThermo();
    initDailyQuote();
    const goodnightToggle = document.getElementById('goodnightToggle');
    if (goodnightToggle) goodnightToggle.classList.toggle('on', isGoodnightEnabled());
    const socialHintToggle = document.getElementById('socialHintToggle');
    if (socialHintToggle) socialHintToggle.classList.toggle('on', isSocialHintEnabled());
    if (document.getElementById('page-calendar').classList.contains('active')) {
      renderCalendar();
    }
  });
});

import { STORAGE_KEY, FAV_KEY, TREE_HOLE_KEY, MONTHLY_REVIEW_KEY, DRIFT_KEY } from './config.js';
import {
  cloudGetRecords, cloudSaveRecord,
  cloudGetFavorites, cloudSaveFavorites,
  cloudGetTreeHoles, cloudSaveTreeHole,
  cloudGetDriftBottles, cloudSaveDriftBottle,
  cloudGetSettings, cloudSaveSettings,
  cloudGetMonthlyReviews, cloudSaveMonthlyReview,
  isReady
} from './supabase.js';

// ============ 通用工具 ============
function safeGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
}

// ============ 数据层（同步读写 LocalStorage + 异步云端同步） ============
export function getRecords() {
  return safeGet(STORAGE_KEY, {});
}

export function saveRecord(date, mood) {
  const r = getRecords();
  const ts = Date.now();
  r[date] = { mood, ts };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
  // 异步云端同步
  cloudSaveRecord(date, mood, ts).catch(() => {});
}

export function today() {
  return new Date().toISOString().split('T')[0];
}

export function todayCount() {
  return getRecords()[today()] ? 1 : 0;
}

// ============ 收藏数据 ============
export function getFavorites() {
  return safeGet(FAV_KEY, []);
}

export function saveFavorites(favs) {
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
  cloudSaveFavorites(favs).catch(() => {});
}

export function isFavorited(text) {
  return getFavorites().some(f => f.text === text);
}

export function toggleFavorite(text) {
  const favs = getFavorites();
  const idx = favs.findIndex(f => f.text === text);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.unshift({ text, date: today() });
  }
  saveFavorites(favs);
  return idx < 0;
}

// ============ 树洞数据 ============
export function getTreeHoleData() {
  return safeGet(TREE_HOLE_KEY, {});
}

export function getTodayTreeHoleCount() {
  const data = getTreeHoleData();
  const todayStr = new Date().toISOString().slice(0, 10);
  return (data[todayStr] || []).length;
}

export function saveTreeHoleEntry(text) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const data = getTreeHoleData();
  if (!data[todayStr]) data[todayStr] = [];
  const ts = Date.now();
  data[todayStr].push({ content: text, ts });
  localStorage.setItem(TREE_HOLE_KEY, JSON.stringify(data));
  cloudSaveTreeHole(todayStr, text, ts).catch(() => {});
}

// ============ 月度回顾数据 ============
export function getMonthlyReviewData() {
  return safeGet(MONTHLY_REVIEW_KEY, {});
}

export function saveMonthlyReviewData(data) {
  localStorage.setItem(MONTHLY_REVIEW_KEY, JSON.stringify(data));
  // 云端同步每条记录
  for (const [month, content] of Object.entries(data)) {
    cloudSaveMonthlyReview(month, content).catch(() => {});
  }
}

// ============ 漂流瓶数据 ============
export function getDriftData() {
  return safeGet(DRIFT_KEY, { sent: {}, received: {} });
}

export function saveDriftData(data) {
  localStorage.setItem(DRIFT_KEY, JSON.stringify(data));
  // 云端同步由调用方在写入时处理
}

// ============ 云端数据拉取 & 合并 ============
export async function pullFromCloud() {
  if (!isReady()) return;

  try {
    // 拉取情绪记录
    const cloudRecords = await cloudGetRecords();
    if (cloudRecords) {
      const local = getRecords();
      // 合并：云端数据覆盖本地同日数据（以较新者为准）
      for (const [date, rec] of Object.entries(cloudRecords)) {
        if (!local[date] || rec.ts > local[date].ts) {
          local[date] = rec;
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
    }

    // 拉取收藏
    const cloudFavs = await cloudGetFavorites();
    if (cloudFavs) {
      const local = getFavorites();
      // 合并：去重
      const merged = [...cloudFavs];
      local.forEach(f => {
        if (!merged.some(m => m.text === f.text)) {
          merged.push(f);
        }
      });
      localStorage.setItem(FAV_KEY, JSON.stringify(merged));
    }

    // 拉取树洞
    const cloudTreeHoles = await cloudGetTreeHoles();
    if (cloudTreeHoles) {
      const local = getTreeHoleData();
      for (const [date, entries] of Object.entries(cloudTreeHoles)) {
        if (!local[date]) local[date] = [];
        entries.forEach(e => {
          if (!local[date].some(l => l.ts === e.ts)) {
            local[date].push(e);
          }
        });
      }
      localStorage.setItem(TREE_HOLE_KEY, JSON.stringify(local));
    }

    // 拉取漂流瓶
    const cloudDrift = await cloudGetDriftBottles();
    if (cloudDrift) {
      const local = getDriftData();
      // 合并发送
      for (const [date, data] of Object.entries(cloudDrift.sent)) {
        if (!local.sent[date]) local.sent[date] = data;
      }
      // 合并接收
      for (const [date, items] of Object.entries(cloudDrift.received)) {
        if (!local.received[date]) local.received[date] = [];
        items.forEach(item => {
          if (!local.received[date].some(r => r.content === item.content)) {
            local.received[date].push(item);
          }
        });
      }
      localStorage.setItem(DRIFT_KEY, JSON.stringify(local));
    }

    // 拉取设置
    const cloudSettings = await cloudGetSettings();
    if (cloudSettings) {
      localStorage.setItem('liubai_goodnight', cloudSettings.goodnight || 'on');
      localStorage.setItem('liubai_social_hint', cloudSettings.social_hint || 'on');
      if (cloudSettings.onboarded) localStorage.setItem('liubai_onboarded', '1');
    }

    // 拉取月度回顾
    const cloudReviews = await cloudGetMonthlyReviews();
    if (cloudReviews) {
      const local = getMonthlyReviewData();
      for (const [month, content] of Object.entries(cloudReviews)) {
        if (!local[month]) local[month] = content;
      }
      localStorage.setItem(MONTHLY_REVIEW_KEY, JSON.stringify(local));
    }

    console.log('[留白] 云端数据已同步到本地');
  } catch (e) {
    console.warn('[留白] 云端同步失败:', e.message);
  }
}

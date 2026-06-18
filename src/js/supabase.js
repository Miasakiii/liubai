import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

let sb = null;
let userId = null;
let ready = false;

// ============ 初始化 ============
export async function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;

  try {
    // 动态加载 Supabase JS 客户端
    if (!window.supabase) {
      await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js');
    }

    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 匿名登录
    const { data, error } = await sb.auth.signInAnonymously();
    if (error) {
      console.warn('[留白] Supabase 匿名登录失败:', error.message);
      return false;
    }

    userId = data.user.id;
    ready = true;
    console.log('[留白] Supabase 已连接，用户:', userId.slice(0, 8) + '...');
    return true;
  } catch (e) {
    console.warn('[留白] Supabase 初始化失败:', e.message);
    return false;
  }
}

export function isReady() { return ready; }
export function getUserId() { return userId; }

// 动态加载脚本
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

// ============ 情绪记录 ============
export async function cloudGetRecords() {
  if (!ready) return null;
  try {
    const { data, error } = await sb.from('mood_records')
      .select('date, mood, ts')
      .eq('user_id', userId);
    if (error) throw error;
    const records = {};
    data.forEach(r => { records[r.date] = { mood: r.mood, ts: r.ts }; });
    return records;
  } catch (e) {
    console.warn('[留白] 云端读取记录失败:', e.message);
    return null;
  }
}

export async function cloudSaveRecord(date, mood, ts) {
  if (!ready) return false;
  try {
    const { error } = await sb.from('mood_records')
      .upsert({ user_id: userId, date, mood, ts }, { onConflict: 'user_id,date' });
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[留白] 云端保存记录失败:', e.message);
    return false;
  }
}

// ============ 收藏 ============
export async function cloudGetFavorites() {
  if (!ready) return null;
  try {
    const { data, error } = await sb.from('favorites')
      .select('content, date, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(f => ({ text: f.content, date: f.date }));
  } catch (e) {
    console.warn('[留白] 云端读取收藏失败:', e.message);
    return null;
  }
}

export async function cloudSaveFavorites(favs) {
  if (!ready) return false;
  try {
    // 先删除该用户所有收藏，再批量插入
    await sb.from('favorites').delete().eq('user_id', userId);
    if (favs.length > 0) {
      const rows = favs.map(f => ({ user_id: userId, content: f.text, date: f.date }));
      const { error } = await sb.from('favorites').insert(rows);
      if (error) throw error;
    }
    return true;
  } catch (e) {
    console.warn('[留白] 云端保存收藏失败:', e.message);
    return false;
  }
}

// ============ 树洞 ============
export async function cloudGetTreeHoles() {
  if (!ready) return null;
  try {
    const { data, error } = await sb.from('tree_holes')
      .select('date, content, ts')
      .eq('user_id', userId);
    if (error) throw error;
    const result = {};
    data.forEach(t => {
      if (!result[t.date]) result[t.date] = [];
      result[t.date].push({ content: t.content, ts: t.ts });
    });
    return result;
  } catch (e) {
    console.warn('[留白] 云端读取树洞失败:', e.message);
    return null;
  }
}

export async function cloudSaveTreeHole(date, content, ts) {
  if (!ready) return false;
  try {
    const { error } = await sb.from('tree_holes')
      .insert({ user_id: userId, date, content, ts });
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[留白] 云端保存树洞失败:', e.message);
    return false;
  }
}

// ============ 漂流瓶 ============
export async function cloudGetDriftBottles() {
  if (!ready) return null;
  try {
    const { data, error } = await sb.from('drift_bottles')
      .select('content, tag, is_sent, date, ts')
      .eq('user_id', userId);
    if (error) throw error;
    const result = { sent: {}, received: {} };
    data.forEach(b => {
      if (b.is_sent) {
        result.sent[b.date] = { content: b.content, ts: b.ts };
      } else {
        if (!result.received[b.date]) result.received[b.date] = [];
        result.received[b.date].push({ content: b.content, tag: b.tag });
      }
    });
    return result;
  } catch (e) {
    console.warn('[留白] 云端读取漂流瓶失败:', e.message);
    return null;
  }
}

export async function cloudSaveDriftBottle(date, content, ts, tag, isSent) {
  if (!ready) return false;
  try {
    const { error } = await sb.from('drift_bottles')
      .insert({ user_id: userId, content, tag, is_sent: isSent, date, ts });
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[留白] 云端保存漂流瓶失败:', e.message);
    return false;
  }
}

// ============ 用户设置 ============
export async function cloudGetSettings() {
  if (!ready) return null;
  try {
    const { data, error } = await sb.from('user_settings')
      .select('goodnight, social_hint, onboarded')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data || null;
  } catch (e) {
    console.warn('[留白] 云端读取设置失败:', e.message);
    return null;
  }
}

export async function cloudSaveSettings(settings) {
  if (!ready) return false;
  try {
    const { error } = await sb.from('user_settings')
      .upsert({ user_id: userId, ...settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[留白] 云端保存设置失败:', e.message);
    return false;
  }
}

// ============ 月度回顾 ============
export async function cloudGetMonthlyReviews() {
  if (!ready) return null;
  try {
    const { data, error } = await sb.from('monthly_reviews')
      .select('month, content')
      .eq('user_id', userId);
    if (error) throw error;
    const result = {};
    data.forEach(r => { result[r.month] = r.content; });
    return result;
  } catch (e) {
    console.warn('[留白] 云端读取月度回顾失败:', e.message);
    return null;
  }
}

export async function cloudSaveMonthlyReview(month, content) {
  if (!ready) return false;
  try {
    const { error } = await sb.from('monthly_reviews')
      .upsert({ user_id: userId, month, content }, { onConflict: 'user_id,month' });
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[留白] 云端保存月度回顾失败:', e.message);
    return false;
  }
}

// ============ 数据迁移：LocalStorage → Supabase ============
export async function migrateLocalToCloud() {
  if (!ready) return;

  const MIGRATED_KEY = 'liubai_cloud_migrated';
  if (localStorage.getItem(MIGRATED_KEY) === '1') return;

  console.log('[留白] 开始迁移本地数据到云端...');

  try {
    // 1. 迁移情绪记录
    const records = JSON.parse(localStorage.getItem('liubai_records') || '{}');
    for (const [date, rec] of Object.entries(records)) {
      await cloudSaveRecord(date, rec.mood, rec.ts);
    }

    // 2. 迁移收藏
    const favs = JSON.parse(localStorage.getItem('liubai_favorites') || '[]');
    if (favs.length > 0) {
      await cloudSaveFavorites(favs);
    }

    // 3. 迁移树洞
    const treeHoles = JSON.parse(localStorage.getItem('liubai_tree_hole') || '{}');
    for (const [date, entries] of Object.entries(treeHoles)) {
      for (const entry of entries) {
        await cloudSaveTreeHole(date, entry.content, entry.ts);
      }
    }

    // 4. 迁移漂流瓶
    const drift = JSON.parse(localStorage.getItem('liubai_drift_bottles') || '{"sent":{},"received":{}}');
    for (const [date, data] of Object.entries(drift.sent)) {
      await cloudSaveDriftBottle(date, data.content, data.ts, null, true);
    }
    for (const [date, items] of Object.entries(drift.received)) {
      for (const item of items) {
        await cloudSaveDriftBottle(date, item.content, Date.now(), item.tag, false);
      }
    }

    // 5. 迁移设置
    const settings = {
      goodnight: localStorage.getItem('liubai_goodnight') || 'on',
      social_hint: localStorage.getItem('liubai_social_hint') || 'on',
      onboarded: localStorage.getItem('liubai_onboarded') === '1',
    };
    await cloudSaveSettings(settings);

    // 6. 迁移月度回顾
    const reviews = JSON.parse(localStorage.getItem('liubai_monthly_review') || '{}');
    for (const [month, content] of Object.entries(reviews)) {
      await cloudSaveMonthlyReview(month, content);
    }

    localStorage.setItem(MIGRATED_KEY, '1');
    console.log('[留白] 数据迁移完成');
  } catch (e) {
    console.warn('[留白] 数据迁移部分失败:', e.message);
  }
}

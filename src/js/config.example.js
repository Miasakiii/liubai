// ============ 配置模板 ============
// 复制此文件为 config.js 并填入你的配置

// 自动检测API地址
// Capacitor 原生 App → 连接线上服务器
// 浏览器 localhost → 连接本地后端
// 浏览器线上 → 相对路径（Nginx 代理）
const IS_NATIVE = window.location.protocol === 'capacitor:' || window.location.protocol === 'file:';
export const API_BASE = IS_NATIVE
  ? 'https://your-domain.com'
  : (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? location.protocol + '//' + location.hostname + ':3001'
    : '';

// Supabase 配置（从 Supabase Dashboard → Settings → API 获取）
export const SUPABASE_URL = 'https://your-project.supabase.co';
export const SUPABASE_ANON_KEY = 'your-anon-key-here';

// Storage keys（无需修改）
export const STORAGE_KEY = 'liubai_records';
export const FAV_KEY = 'liubai_favorites';
export const TREE_HOLE_KEY = 'liubai_tree_hole';
export const MONTHLY_REVIEW_KEY = 'liubai_monthly_review';
export const DRIFT_KEY = 'liubai_drift_bottles';
export const HINT_COUNT_KEY = 'liubai_hint_count';
export const HINT_DATE_KEY = 'liubai_hint_date';
export const SOCIAL_HINT_SETTING_KEY = 'liubai_social_hint';

// ============ 工具函数 ============

/**
 * HTML 转义，防止 XSS
 * @param {string} text - 需要转义的文本
 * @returns {string} 转义后的 HTML 安全文本
 */
export function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

/**
 * 安全地设置元素的文本内容
 * @param {HTMLElement} el - 目标元素
 * @param {string} text - 文本内容
 */
export function safeSetText(el, text) {
  if (el) el.textContent = text || '';
}

/**
 * 生成安全的 innerHTML（转义后的内容）
 * @param {string} text - 原始文本
 * @returns {string} 转义后的 HTML 字符串
 */
export function safeHtml(text) {
  return escapeHtml(text);
}

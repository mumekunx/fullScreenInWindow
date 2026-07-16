(function () {
  'use strict';

  const api = typeof browser !== 'undefined' ? browser : chrome;
  let enabled = true, active = false, target = null, overlay = null, controls = null, timer = null;

  // 設定読み込み → スクリプト注入
  api.storage.sync.get(['wfsEnabled'], r => {
    enabled = r.wfsEnabled !== false;
    reflect();
    inject();
  });

  function reflect() {
    document.documentElement.dataset.wfsEnabled = String(enabled);
  }

  function inject() {
    if (document.querySelector('[data-wfs]')) return;
    const s = document.createElement('script');
    s.src = api.runtime.getURL('injected.js');
    s.dataset.wfs = '1';
    (document.head || document.documentElement).appendChild(s);
    s.addEventListener('load', () => s.remove(), { once: true });
  }

  // ---- ページからのイベント受信（セキュア） ----
  window.addEventListener('__wfs_enter__', e => {
    if (!enabled) return;
    const id = e.detail?.id;
    // wfsId のフォーマット検証（インジェクション対策）
    if (typeof id !== 'string' || !/^wfs-\d+$/.test(id)) return;
    const el = document.querySelector(`[data-wfs-id="${CSS.escape(id)}"]`);
    if (el) enter(el);
  });

  window.addEventListener('__wfs_exit__', () => { if (active) cleanup(false); });

  // ---- ウィンドウフルスクリーン開始 ----
  function enter(el) {
    if (active) return;
    active = true; target = el;

    overlay = document.createElement('div');
    overlay.id = 'wfs-overlay';

    // innerHTML の代わりに DOM API でコントロールを構築（XSS対策）
    controls = document.createElement('div');
    controls.id = 'wfs-controls';

    const inner = document.createElement('div');
    inner.id = 'wfs-controls-inner';

    const badge = document.createElement('div');
    badge.id = 'wfs-badge';
    badge.textContent = 'Window Fullscreen';

    const btn = document.createElement('button');
    btn.id = 'wfs-exit-btn';
    btn.title = 'ウィンドウフルスクリーンを終了 (Esc)';
    btn.textContent = '✕ 終了';
    btn.addEventListener('click', () => cleanup(true), { once: true });

    inner.append(badge, btn);
    controls.appendChild(inner);
    document.documentElement.append(overlay, controls);

    el.classList.add('wfs-active');
    document.documentElement.classList.add('wfs-lock');
    document.addEventListener('mousemove', onMove, { passive: true });
    show();
  }

  function show() {
    if (!controls) return;
    controls.classList.add('wfs-on');
    clearTimeout(timer);
    timer = setTimeout(() => controls?.classList.remove('wfs-on'), 3000);
  }

  function onMove() {
    if (!active) { document.removeEventListener('mousemove', onMove); return; }
    show();
  }

  function cleanup(notify) {
    active = false;
    clearTimeout(timer); timer = null;
    document.removeEventListener('mousemove', onMove);
    target?.classList.remove('wfs-active');
    target?.removeAttribute('data-wfs-id');
    target = null;
    overlay?.remove(); overlay = null;
    controls?.remove(); controls = null;
    document.documentElement.classList.remove('wfs-lock');
    if (notify) window.dispatchEvent(new CustomEvent('__wfs_exit_from_content__'));
  }

  // ---- メッセージ受信（ポップアップから） ----
  api.runtime.onMessage.addListener((msg, _, res) => {
    if (msg.type === 'WFS_SET_ENABLED') {
      enabled = msg.enabled;
      reflect();
      if (!enabled && active) cleanup(true);
      res({ ok: true });
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && active) cleanup(true);
  }, true);
})();

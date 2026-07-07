(function () {
  'use strict';
  const api = typeof browser !== 'undefined' ? browser : chrome;
  const tog = document.getElementById('tog');
  const dot = document.getElementById('dot');
  const st  = document.getElementById('st');
  const card = document.getElementById('card');

  api.storage.sync.get(['wfsEnabled'], r => setUI(r.wfsEnabled !== false));

  tog.addEventListener('change', () => {
    const on = tog.checked;
    api.storage.sync.set({ wfsEnabled: on });
    setUI(on);
    api.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) api.tabs.sendMessage(tabs[0].id, { type: 'WFS_SET_ENABLED', enabled: on }).catch(() => {});
    });
  });

  function setUI(on) {
    tog.checked = on;
    dot.className  = 'dot ' + (on ? 'on' : 'off');
    st.className   = on ? 'on' : 'off';
    st.textContent = on ? '有効 – フルスクリーンを乗っ取り中' : '無効 – 通常のフルスクリーン';
    card.className = 'card ' + (on ? 'on' : 'off');
  }
})();

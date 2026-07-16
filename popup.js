(function () {
  'use strict';

  const api = chrome;
  const toggle = document.getElementById('tog');
  const dot = document.getElementById('dot');
  const status = document.getElementById('st');
  const card = document.getElementById('card');
  let tabId = null;
  let loaded = false;
  let busy = true;

  function lastErrorMessage() {
    return api.runtime.lastError?.message || '';
  }

  function send(message, done) {
    api.tabs.sendMessage(tabId, message, response => {
      const error = lastErrorMessage();
      done(error ? null : response, error);
    });
  }

  function inject(done) {
    api.scripting.insertCSS({ target: { tabId }, files: ['content.css'] }, () => {
      const cssError = lastErrorMessage();
      if (cssError) return done(null, cssError);

      api.scripting.executeScript({ target: { tabId }, files: ['content.js'] }, () => {
        const scriptError = lastErrorMessage();
        if (scriptError) return done(null, scriptError);

        loaded = true;
        send({ type: 'WFS_SET_ENABLED', enabled: true }, done);
      });
    });
  }

  function setBusy(value) {
    busy = value;
    toggle.disabled = value || tabId === null;
  }

  function setUI(on, active, message) {
    toggle.checked = on;
    dot.className = `dot ${on ? 'on' : 'off'}`;
    status.className = on ? 'on' : 'off';
    status.textContent = message || (on
      ? (active ? 'ウィンドウ表示中' : 'このタブで待機中')
      : 'このタブでは停止中');
    card.className = `card ${on ? 'on' : 'off'}`;
  }

  api.tabs.query({ active: true, currentWindow: true }, tabs => {
    const error = lastErrorMessage();
    tabId = error ? null : tabs[0]?.id ?? null;

    if (tabId === null) {
      setUI(false, false, '現在のタブを取得できません');
      setBusy(false);
      return;
    }

    send({ type: 'WFS_GET_STATUS' }, response => {
      loaded = Boolean(response?.loaded);
      setUI(Boolean(response?.enabled), Boolean(response?.active));
      setBusy(false);
    });
  });

  toggle.addEventListener('change', () => {
    if (busy || tabId === null) return;
    const enable = toggle.checked;
    setBusy(true);

    const finish = (response, error) => {
      if (error) {
        setUI(false, false, 'このページでは利用できません');
      } else if (!response?.ok) {
        setUI(false, false, response?.error || '有効化できませんでした');
      } else {
        setUI(Boolean(response.enabled), Boolean(response.active));
      }
      setBusy(false);
    };

    if (enable && !loaded) {
      inject(finish);
      return;
    }

    if (!loaded) {
      setUI(false, false);
      setBusy(false);
      return;
    }

    send({ type: 'WFS_SET_ENABLED', enabled: enable }, finish);
  });
})();

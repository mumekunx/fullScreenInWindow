(function () {
  'use strict';

  if (globalThis.__windowFullscreenContentLoaded) return;
  globalThis.__windowFullscreenContentLoaded = true;

  const api = typeof browser !== 'undefined' ? browser : chrome;
  let enabled = false;
  let active = false;
  let target = null;
  let overlay = null;
  let loader = null;

  function injectMainScript() {
    if (!enabled || loader) return;

    loader = document.createElement('script');
    loader.src = api.runtime.getURL('injected.js');
    loader.dataset.windowFullscreenLoader = 'true';
    loader.addEventListener('load', () => {
      loader?.remove();
      loader = null;
      if (!enabled) window.dispatchEvent(new CustomEvent('__window_fullscreen_uninstall__'));
    }, { once: true });
    loader.addEventListener('error', () => {
      loader?.remove();
      loader = null;
      enabled = false;
    }, { once: true });
    (document.head || document.documentElement).appendChild(loader);
  }

  function enter(element) {
    if (!enabled || active) return;
    active = true;
    target = element;

    if (element === document.documentElement || element === document.body) {
      document.documentElement.classList.add('window-fullscreen-extension-root');
    } else {
      overlay = document.createElement('div');
      overlay.id = 'window-fullscreen-extension-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      element.classList.add('window-fullscreen-extension-active');
      document.documentElement.appendChild(overlay);
    }

    document.documentElement.classList.add('window-fullscreen-extension-lock');
  }

  function cleanup(notifyMain) {
    active = false;
    target?.classList.remove('window-fullscreen-extension-active');
    target?.removeAttribute('data-window-fullscreen-id');
    target = null;
    overlay?.remove();
    overlay = null;
    document.documentElement.classList.remove('window-fullscreen-extension-lock');
    document.documentElement.classList.remove('window-fullscreen-extension-root');

    if (notifyMain) {
      window.dispatchEvent(new CustomEvent('__window_fullscreen_exit_from_content__'));
    }
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    if (enabled) {
      injectMainScript();
    } else {
      loader?.remove();
      loader = null;
      if (active) cleanup(true);
      window.dispatchEvent(new CustomEvent('__window_fullscreen_uninstall__'));
    }
    return { ok: true, loaded: true, enabled, active };
  }

  window.addEventListener('__window_fullscreen_enter__', event => {
    if (!enabled) return;
    const id = event.detail?.id;
    if (typeof id !== 'string' || !/^wfs-\d+$/.test(id)) return;
    const element = document.querySelector(`[data-window-fullscreen-id="${CSS.escape(id)}"]`);
    if (element) enter(element);
  });

  window.addEventListener('__window_fullscreen_exit__', () => {
    if (active) cleanup(false);
  });

  api.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message?.type === 'WFS_GET_STATUS') {
      respond({ ok: true, loaded: true, enabled, active });
      return;
    }

    if (message?.type === 'WFS_SET_ENABLED') {
      respond(setEnabled(message.enabled));
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && active) cleanup(true);
  }, true);
})();

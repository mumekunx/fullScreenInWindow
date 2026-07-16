(function () {
  'use strict';

  const runtimeKey = '__windowFullscreenMainRuntime';
  if (window[runtimeKey]) return;

  const nativeRequest = Element.prototype.requestFullscreen;
  const nativeWebkitRequest = Element.prototype.webkitRequestFullscreen;
  const nativeExit = Document.prototype.exitFullscreen;
  const nativeWebkitExit = Document.prototype.webkitExitFullscreen;
  const originalDocumentProperties = new Map();
  const patchedPropertyGetters = new Map();
  const propertyNames = ['fullscreenElement', 'webkitFullscreenElement'];
  let active = false;
  let target = null;
  let counter = 0;

  for (const name of propertyNames) {
    originalDocumentProperties.set(name, Object.getOwnPropertyDescriptor(document, name));
  }

  function setFullscreenElement(value) {
    for (const name of propertyNames) {
      try {
        const getter = () => value;
        patchedPropertyGetters.set(name, getter);
        Object.defineProperty(document, name, {
          configurable: true,
          get: getter
        });
      } catch (_) {}
    }
  }

  function fireChange() {
    for (const name of ['fullscreenchange', 'webkitfullscreenchange']) {
      document.dispatchEvent(new Event(name, { bubbles: true }));
    }
  }

  function enter(element) {
    active = true;
    target = element;
    const id = `wfs-${++counter}`;
    element.setAttribute('data-window-fullscreen-id', id);
    setFullscreenElement(element);
    window.dispatchEvent(new CustomEvent('__window_fullscreen_enter__', { detail: { id } }));
    setTimeout(fireChange, 0);
    return Promise.resolve();
  }

  function exit() {
    if (!active) return Promise.resolve();
    active = false;
    target?.removeAttribute('data-window-fullscreen-id');
    target = null;
    setFullscreenElement(null);
    window.dispatchEvent(new CustomEvent('__window_fullscreen_exit__'));
    setTimeout(fireChange, 0);
    return Promise.resolve();
  }

  function requestFullscreen() {
    return enter(this);
  }

  function webkitRequestFullscreen() {
    return enter(this);
  }

  function exitFullscreen() {
    return active ? exit() : (nativeExit ? nativeExit.call(this) : Promise.resolve());
  }

  function webkitExitFullscreen() {
    return active ? exit() : (nativeWebkitExit ? nativeWebkitExit.call(this) : undefined);
  }

  function restore() {
    if (active) exit();

    if (Element.prototype.requestFullscreen === requestFullscreen) {
      Element.prototype.requestFullscreen = nativeRequest;
    }
    if (Element.prototype.webkitRequestFullscreen === webkitRequestFullscreen) {
      if (nativeWebkitRequest) Element.prototype.webkitRequestFullscreen = nativeWebkitRequest;
      else delete Element.prototype.webkitRequestFullscreen;
    }
    if (Document.prototype.exitFullscreen === exitFullscreen) {
      Document.prototype.exitFullscreen = nativeExit;
    }
    if (Document.prototype.webkitExitFullscreen === webkitExitFullscreen) {
      if (nativeWebkitExit) Document.prototype.webkitExitFullscreen = nativeWebkitExit;
      else delete Document.prototype.webkitExitFullscreen;
    }

    for (const [name, descriptor] of originalDocumentProperties) {
      try {
        if (!patchedPropertyGetters.has(name)) continue;
        const current = Object.getOwnPropertyDescriptor(document, name);
        if (current?.get !== patchedPropertyGetters.get(name)) continue;
        if (descriptor) Object.defineProperty(document, name, descriptor);
        else delete document[name];
      } catch (_) {}
    }

    window.removeEventListener('__window_fullscreen_exit_from_content__', exit);
    window.removeEventListener('__window_fullscreen_uninstall__', restore);
    delete window[runtimeKey];
  }

  window[runtimeKey] = { restore };
  Element.prototype.requestFullscreen = requestFullscreen;
  if (nativeWebkitRequest) Element.prototype.webkitRequestFullscreen = webkitRequestFullscreen;
  Document.prototype.exitFullscreen = exitFullscreen;
  if (nativeWebkitExit) Document.prototype.webkitExitFullscreen = webkitExitFullscreen;
  window.addEventListener('__window_fullscreen_exit_from_content__', exit);
  window.addEventListener('__window_fullscreen_uninstall__', restore);
})();

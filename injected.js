(function () {
  'use strict';

  const _sym = Symbol('wfs');
  if (window[_sym]) return;
  window[_sym] = true;

  const _reqFS   = Element.prototype.requestFullscreen;
  const _wkReqFS = Element.prototype.webkitRequestFullscreen;
  const _exitFS  = Document.prototype.exitFullscreen;
  const _wkExit  = Document.prototype.webkitExitFullscreen;

  let active = false, target = null, counter = 0;

  function patchProps(el) {
    try {
      const get = (v) => () => v;
      for (const k of ['fullscreenElement','webkitFullscreenElement'])
        Object.defineProperty(document, k, { get: () => active ? el : null, configurable: true });
      for (const k of ['fullscreenEnabled','webkitFullscreenEnabled'])
        Object.defineProperty(document, k, { get: get(true), configurable: true });
    } catch (_) {}
  }

  function fireChange(el) {
    ['fullscreenchange','webkitfullscreenchange'].forEach(n => {
      document.dispatchEvent(new Event(n, { bubbles: true }));
      el && el.dispatchEvent(new Event(n, { bubbles: true }));
    });
  }

  function enter(el) {
    active = true; target = el;
    const id = 'wfs-' + (++counter);
    el.setAttribute('data-wfs-id', id);
    patchProps(el);
    window.dispatchEvent(new CustomEvent('__wfs_enter__', { detail: { id } }));
    setTimeout(() => fireChange(el), 50);
    return Promise.resolve();
  }

  function exit() {
    if (!active) return Promise.resolve();
    const el = target;
    active = false; target = null;
    try {
      for (const k of ['fullscreenElement','webkitFullscreenElement'])
        Object.defineProperty(document, k, { get: () => null, configurable: true });
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('__wfs_exit__'));
    setTimeout(() => fireChange(el), 50);
    return Promise.resolve();
  }

  Element.prototype.requestFullscreen = function () { return enter(this); };
  if (_wkReqFS) Element.prototype.webkitRequestFullscreen = function () { return enter(this); };

  Document.prototype.exitFullscreen = function () {
    return active ? exit() : (_exitFS ? _exitFS.call(this) : Promise.resolve());
  };
  if (_wkExit) Document.prototype.webkitExitFullscreen = function () {
    return active ? exit() : _wkExit.call(this);
  };

  window.addEventListener('__wfs_exit_from_content__', exit);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && active) exit(); }, true);
})();

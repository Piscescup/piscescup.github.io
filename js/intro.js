(() => {
  'use strict';
  const intro = document.getElementById('intro');
  if (!intro) return;
  const root = document.documentElement;
  const storageKey = 'piscescup.intro';
  const skip = intro.querySelector('.intro-skip');
  const main = document.getElementById('main');
  let closed = false;
  let autoClose = 0;

  const remember = () => {
    try { sessionStorage.setItem(storageKey, 'done'); } catch { /* storage is optional */ }
  };

  function dismiss() {
    if (closed) return;
    closed = true;
    remember();
    clearTimeout(autoClose);
    root.classList.remove('intro-active');
    document.removeEventListener('keydown', onKey, true);
    intro.removeEventListener('pointerdown', onPointer);
    skip?.removeEventListener('click', onSkip);
    intro.classList.add('is-leaving');
    setTimeout(() => intro.remove(), 520);
    main?.focus({ preventScroll: true });
  }

  function onKey(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    event.preventDefault();
    dismiss();
  }

  function onPointer() {
    dismiss();
  }

  function onSkip(event) {
    event.stopPropagation();
    dismiss();
  }

  if (root.dataset.intro === 'skip') {
    intro.remove();
    return;
  }

  root.classList.add('intro-active');
  skip?.focus({ preventScroll: true });
  document.addEventListener('keydown', onKey, true);
  intro.addEventListener('pointerdown', onPointer);
  skip?.addEventListener('click', onSkip);
  autoClose = setTimeout(dismiss, 15000);
})();

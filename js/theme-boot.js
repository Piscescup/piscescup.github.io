// Runs before first paint to prevent theme flash on reload.
(() => {
  try {
    const saved = localStorage.getItem('piscescup.theme');
    const theme = saved === 'dark' || saved === 'light' ? saved : 'light';
    document.documentElement.dataset.theme = theme;
  } catch {
    document.documentElement.dataset.theme = 'light';
  }
})();

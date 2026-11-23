// Runs before first paint so a repeat visit in the same tab skips the intro.
try {
  if (sessionStorage.getItem('piscescup.intro') === 'done') document.documentElement.dataset.intro = 'skip';
} catch { /* storage is optional */ }

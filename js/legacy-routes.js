// GitHub Pages serves /404.html for the former language-specific URLs.
(() => {
  const url = new URL(location.href);
  const oldPath = url.pathname;
  if (!oldPath.startsWith('/en/')) return;
  const destination = oldPath.slice(3);
  const known = ['/', '/index.html', '/projects/pc-develop-lib.html', '/projects/piscescup-easy.html', '/projects/more-advancements.html', '/projects/commons-lib.html'];
  if (!known.includes(destination)) return;
  url.pathname = destination;
  url.searchParams.set('lang','en');
  location.replace(url.href);
})();

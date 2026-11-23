document.documentElement.classList.add('js');

const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#site-nav');
const navLinks = [...document.querySelectorAll('.nav-link')];
const header = document.querySelector('.site-header');
const themeButtons = [...document.querySelectorAll('[data-theme-toggle]')];
const themeMeta = document.querySelector('meta[name="theme-color"]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const menuLabel = (open) =>
  window.siteI18n?.t(open ? 'nav.close' : 'nav.open') || (open ? '收起导航' : '展开导航');

function closeMenu(returnFocus = false) {
  menuButton?.setAttribute('aria-expanded', 'false');
  menuButton?.setAttribute('aria-label', menuLabel(false));
  navigation?.classList.remove('is-open');
  if (returnFocus) menuButton?.focus();
}

menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', menuLabel(open));
  navigation?.classList.toggle('is-open', open);
});

navigation?.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeMenu();
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.nav-shell')) closeMenu();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') closeMenu(true);
});

document.addEventListener('languagechange', () => {
  menuButton?.setAttribute('aria-label', menuLabel(menuButton.getAttribute('aria-expanded') === 'true'));
});

window.matchMedia('(min-width: 821px)').addEventListener('change', () => closeMenu());

/* ---------- Theme switcher (Light #faf9f5 / Dark #141413) ---------- */

function applyTheme(theme, persist = false) {
  const normalized = theme === 'dark' ? 'dark' : 'light';
  if (persist) document.documentElement.classList.add('theme-switching');
  document.documentElement.dataset.theme = normalized;
  themeButtons.forEach((btn) => btn.setAttribute('aria-pressed', String(normalized === 'dark')));
  if (themeMeta) themeMeta.setAttribute('content', normalized === 'dark' ? '#141413' : '#faf9f5');
  if (persist) {
    void document.documentElement.offsetHeight;
    requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.remove('theme-switching')));
    try {
      localStorage.setItem('piscescup.theme', normalized);
    } catch { /* storage is optional */ }
  }
}

applyTheme(document.documentElement.dataset.theme || 'light', false);
themeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next, true);
  });
});

/* ---------- Header scroll state & tutorial reading progress ---------- */

const progressBar = document.querySelector('.reading-progress-fill');

function onScroll() {
  if (header) header.classList.toggle('is-scrolled', window.scrollY > 12);
  if (progressBar) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    progressBar.style.transform = `scaleX(${ratio})`;
  }
}

window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- Active nav link & home scroll-spy ---------- */

function setActiveNav(hash) {
  const page = document.body.dataset.page;
  navLinks.forEach((link) => {
    const target = new URL(link.href);
    const active =
      page === 'tutorial'
        ? target.pathname.endsWith('/tutorials/index.html')
        : page === 'tool'
          ? target.pathname.endsWith('/tools/index.html')
          : page === 'catalog'
            ? target.pathname.endsWith('/projects/index.html')
            : page === 'project'
              ? target.hash === '#projects'
              : !target.pathname.includes('/tutorials/') &&
                !target.pathname.includes('/tools/') &&
                !target.pathname.includes('/projects/') &&
                target.hash === hash;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}

function updateActiveLink() {
  setActiveNav(location.hash || '#home');
}

window.addEventListener('hashchange', updateActiveLink);
updateActiveLink();

if (document.body.dataset.page === 'home' && 'IntersectionObserver' in window) {
  const sections = ['home', 'directions', 'projects', 'about']
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const visible = new Map();
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.set(entry.target.id, entry.intersectionRatio);
        else visible.delete(entry.target.id);
      });
      if (!visible.size) return;
      const topId = sections.find((section) => visible.has(section.id))?.id;
      if (topId) setActiveNav(`#${topId}`);
    },
    { rootMargin: '-18% 0px -55% 0px', threshold: [0, 0.2, 0.5] }
  );
  sections.forEach((section) => spy.observe(section));
}

/* ---------- Hero showcase hover & focus live preview ---------- */

const heroShowcase = document.querySelector('[data-hero-showcase]');
if (heroShowcase) {
  const triggers = [...document.querySelectorAll('[data-preview-trigger]')];
  const panels = [...heroShowcase.querySelectorAll('[data-shell-panel]')];
  let activeId = panels.find((panel) => !panel.hidden)?.dataset.shellPanel || panels[0]?.dataset.shellPanel;

  const activatePreview = (id) => {
    if (!id || id === activeId) return;
    activeId = id;
    triggers.forEach((trigger) => {
      trigger.classList.toggle('is-active', trigger.dataset.previewTrigger === id);
    });
    panels.forEach((panel) => {
      const match = panel.dataset.shellPanel === id;
      panel.hidden = !match;
      panel.classList.toggle('is-active', match);
      panel.classList.remove('is-entering');
      if (match && !reducedMotion) {
        void panel.offsetWidth;
        panel.classList.add('is-entering');
      }
    });
  };

  const supportsPointer = 'onpointerenter' in window;
  triggers.forEach((trigger) => {
    const id = trigger.dataset.previewTrigger;
    if (supportsPointer) {
      trigger.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'touch') return;
        activatePreview(id);
      });
    } else {
      trigger.addEventListener('mouseenter', () => activatePreview(id));
    }
    trigger.addEventListener('focus', () => activatePreview(id));
  });
}

/* ---------- Project page sticky section-bar spy ---------- */

const projectNavLinks = [...document.querySelectorAll('.project-sections a[href^="#"]')];
if (projectNavLinks.length && 'IntersectionObserver' in window) {
  const targets = projectNavLinks
    .map((link) => ({ link, el: document.getElementById(link.getAttribute('href').slice(1)) }))
    .filter((item) => item.el);
  const activate = (id) => {
    projectNavLinks.forEach((link) => {
      const match = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('is-active', match);
      if (match) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  if (targets.length) activate(targets[0].el.id);
  const visible = new Set();
  const projectSpy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });
      const first = targets.find((item) => visible.has(item.el));
      if (first) activate(first.el.id);
    },
    { rootMargin: '-20% 0px -55% 0px' }
  );
  targets.forEach((item) => projectSpy.observe(item.el));
}

/* ---------- Homepage project category filter ---------- */

const filterBar = document.querySelector('[data-project-filters]');
if (filterBar) {
  filterBar.hidden = false;
  const buttons = [...filterBar.querySelectorAll('[data-filter]')];
  const cards = [...document.querySelectorAll('.work-card[data-category]')];
  const applyFilter = (category) => {
    buttons.forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.filter === category)));
    cards.forEach((card) => {
      card.hidden = !(category === 'all' || card.dataset.category === category);
    });
  };
  buttons.forEach((btn) => btn.addEventListener('click', () => applyFilter(btn.dataset.filter)));
}

/* ---------- Gentle scroll reveal ---------- */

const reveals = [...document.querySelectorAll('[data-reveal]')];
if (reveals.length && !reducedMotion && 'IntersectionObserver' in window) {
  const revealAboveOrInView = () => {
    const threshold = window.innerHeight * 0.96;
    reveals.forEach((el) => {
      if (el.classList.contains('is-visible')) return;
      if (el.getBoundingClientRect().top <= threshold) el.classList.add('is-visible');
    });
  };
  const revealObserver = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
      revealAboveOrInView();
    },
    { rootMargin: '0px 0px -4% 0px', threshold: 0.04 }
  );
  reveals.forEach((el) => revealObserver.observe(el));
  window.addEventListener('scroll', revealAboveOrInView, { passive: true });
  revealAboveOrInView();
} else {
  reveals.forEach((el) => el.classList.add('is-visible'));
}

/* ---------- Footer copyright year ---------- */

const year = document.querySelector('#year');
if (year) year.textContent = String(new Date().getFullYear());

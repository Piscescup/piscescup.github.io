document.documentElement.classList.add('js');
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#site-nav');
const navLinks = [...document.querySelectorAll('.nav-link')];
const menuLabel = (open) => window.siteI18n?.t(open ? 'nav.close' : 'nav.open') || (open ? '收起导航' : '展开导航');

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
navigation?.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
});
document.addEventListener('click', event => {
    if (!event.target.closest('.nav-shell')) closeMenu();
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') closeMenu(true);
});
document.addEventListener('languagechange', () => {
    menuButton?.setAttribute('aria-label', menuLabel(menuButton.getAttribute('aria-expanded') === 'true'));
});
window.matchMedia('(min-width: 761px)').addEventListener('change', () => closeMenu());

function updateActiveLink() {
    const page = document.body.dataset.page;
    const hash = page === 'project' ? '#projects' : location.hash || '#home';
    navLinks.forEach(link => {
        const target = new URL(link.href);
        const active = page === 'catalog' ? target.pathname.endsWith('/projects/index.html') : target.hash === hash;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
    });
}

window.addEventListener('hashchange', updateActiveLink);
updateActiveLink();
const year = document.querySelector('#year');
if (year) year.textContent = String(new Date().getFullYear());

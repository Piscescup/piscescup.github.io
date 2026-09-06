document.documentElement.classList.add('js');
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#site-nav');
const navLinks = [...document.querySelectorAll('.nav-link')];
const isEnglish = document.documentElement.lang === 'en';
const menuLabels = isEnglish ? ['Open navigation', 'Close navigation'] : ['展开导航', '收起导航'];

function closeMenu(returnFocus = false) {
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', menuLabels[0]);
    navigation.classList.remove('is-open');
    if (returnFocus) menuButton.focus();
}

menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    menuButton.setAttribute('aria-label', menuLabels[isOpen ? 0 : 1]);
    navigation.classList.toggle('is-open', !isOpen);
});
navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
});
document.addEventListener('click', (event) => {
    if (!event.target.closest('.nav-shell')) closeMenu();
});
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
});
window.matchMedia('(min-width: 761px)').addEventListener('change', () => closeMenu());

function updateActiveLink() {
    const hash = document.body.dataset.page === 'project' ? '#projects' : window.location.hash || '#home';
    navLinks.forEach((link) => {
        const active = new URL(link.href).hash === hash;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
    });
}

window.addEventListener('hashchange', updateActiveLink);
updateActiveLink();
document.querySelector('#year').textContent = String(new Date().getFullYear());

// Every translation has a real URL; preserve the current section when switching.
document.querySelectorAll('[data-language-switch]').forEach((link) => {
    const keepSection = () => {
        const destination = new URL(link.href);
        destination.hash = window.location.hash;
        link.href = destination.href;
    };
    keepSection();
    window.addEventListener('hashchange', keepSection);
});

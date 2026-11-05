(() => {
    'use strict';
    const directory = document.querySelector('.tutorial-navigation');
    const mobile = window.matchMedia('(max-width: 800px)');
    if (directory) {
        directory.open = !mobile.matches;
        mobile.addEventListener('change', event => { directory.open = !event.matches; });
    }
    const links = [...document.querySelectorAll('[data-tutorial-toc]')];
    const sections = links.map(link => document.getElementById(new URL(link.href).hash.slice(1))).filter(Boolean);
    if (!sections.length) return;
    const activate = id => links.forEach(link => {
        if (new URL(link.href).hash === '#' + id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
    });
    activate(sections[0].id);
    if ('IntersectionObserver' in window) {
        const visible = new Set();
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) visible.add(entry.target);
                else visible.delete(entry.target);
            });
            const first = sections.find(section => visible.has(section));
            if (first) activate(first.id);
        }, { rootMargin: '-10% 0px -35% 0px' });
        sections.forEach(section => observer.observe(section));
    }
})();

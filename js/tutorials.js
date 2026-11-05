(() => {
    'use strict';
    const directory = document.querySelector('.tutorial-navigation');
    const mobile = window.matchMedia('(max-width: 800px)');
    if (directory) {
        directory.open = !mobile.matches;
        mobile.addEventListener('change', event => { directory.open = !event.matches; });
    }
    const t = key => window.siteI18n?.t(key) ?? window.SITE_TRANSLATIONS?.['zh-CN']?.[key] ?? key;
    // Add syntax colors without altering the text used by the copy button.
    document.querySelectorAll('[data-tutorial-source]').forEach(code => {
        const source = code.textContent;
        const tokens = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|@\w+|\b(?:public|private|static|final|class|return|new|import|void|throws)\b/g;
        const fragment = document.createDocumentFragment();
        let offset = 0;
        for (const match of source.matchAll(tokens)) {
            fragment.append(document.createTextNode(source.slice(offset, match.index)));
            const span = document.createElement('span');
            span.className = 'tutorial-token-' + (match[0].startsWith('/') ? 'comment' : match[0].startsWith('"') ? 'string' : match[0].startsWith('@') ? 'annotation' : 'keyword');
            span.textContent = match[0];
            fragment.append(span);
            offset = match.index + match[0].length;
        }
        fragment.append(document.createTextNode(source.slice(offset)));
        code.replaceChildren(fragment);
    });
    document.querySelectorAll('[data-tutorial-example]').forEach(example => {
        const button = example.querySelector('[data-tutorial-copy]');
        const code = example.querySelector('code');
        const feedback = example.querySelector('[data-tutorial-feedback]');
        if (!button || !code || !feedback || !window.SiteClipboard) return;
        let status = '';
        let timer;
        button.hidden = false;
        const announce = key => { status = key; feedback.textContent = key ? t(key) : ''; };
        button.addEventListener('click', async () => {
            button.disabled = true;
            clearTimeout(timer);
            try {
                const copied = await window.SiteClipboard.writeText(code.textContent);
                if (!copied) window.SiteClipboard.selectCode(code);
                announce(copied ? 'tutorial.code.copied' : 'tutorial.code.manual');
                timer = setTimeout(() => announce(''), 4000);
            } finally { button.disabled = false; }
        });
        document.addEventListener('languagechange', () => { if (status) announce(status); });
    });
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

(() => {
    'use strict';
    const dictionaries = window.SITE_TRANSLATIONS;
    if (!dictionaries) return; // The complete Chinese HTML remains readable.
    const supported = ['zh-CN', 'en'];
    const storageKey = 'piscescup.language';
    const normalize = (value) => supported.includes(value) ? value : null;
    let language = 'zh-CN';

    function preferredLanguage() {
        const fromUrl = new URL(location.href).searchParams.get('lang');
        if (fromUrl !== null) return normalize(fromUrl) || 'zh-CN';
        try {
            return normalize(localStorage.getItem(storageKey)) || 'zh-CN';
        } catch {
            return 'zh-CN';
        }
    }

    function t(key) {
        return dictionaries[language][key] ?? dictionaries['zh-CN'][key] ?? key;
    }

    function updateLinks() {
        document.querySelectorAll('a[href]').forEach(link => {
            if (link.hasAttribute('download')) return;
            const destination = new URL(link.getAttribute('href'), location.href);
            if (destination.protocol !== location.protocol || destination.host !== location.host) return;
            if (!destination.pathname.endsWith('/') && !destination.pathname.endsWith('.html')) return;
            destination.searchParams.set('lang', language);
            link.href = destination.href;
        });
    }

    function apply(nextLanguage, push = false) {
        language = normalize(nextLanguage) || 'zh-CN';
        document.documentElement.lang = language;
        document.querySelectorAll('[data-i18n]').forEach(node => {
            node.textContent = t(node.dataset.i18n);
        });
        for (const attribute of ['aria-label', 'alt', 'content', 'placeholder', 'title']) {
            document.querySelectorAll(`[data-i18n-${attribute}]`).forEach(node => {
                node.setAttribute(attribute, t(node.getAttribute(`data-i18n-${attribute}`)));
            });
        }
        document.querySelectorAll('[data-language]').forEach(button => {
            button.setAttribute('aria-pressed', String(button.dataset.language === language));
        });
        const current = new URL(location.href);
        // Record the initial language too, so Back restores that entry's language.
        current.searchParams.set('lang', language);
        try {
            history[push ? 'pushState' : 'replaceState']({}, '', current);
        } catch { /* file: history may be restricted */
        }
        try {
            localStorage.setItem(storageKey, language);
        } catch { /* Storage is optional. */
        }
        updateLinks();
        document.dispatchEvent(new CustomEvent('languagechange', {detail: {language}}));
    }

    window.siteI18n = {
        t, get language() {
            return language;
        }
    };
    document.querySelectorAll('[data-language]').forEach(button => {
        button.addEventListener('click', () => {
            if (button.dataset.language !== language) apply(button.dataset.language, true);
        });
    });
    window.addEventListener('popstate', () => apply(preferredLanguage()));
    apply(preferredLanguage());
})();

(() => {
    'use strict';
    if (!window.SiteClipboard) return;
    const t = key => window.siteI18n?.t(key) ?? window.SITE_TRANSLATIONS?.['zh-CN']?.[key] ?? key;
    document.querySelectorAll('[data-example]').forEach(example => {
        const button = example.querySelector('[data-example-copy]');
        const code = example.querySelector('[data-example-code]');
        const feedback = example.querySelector('[data-example-feedback]');
        let busy = false;
        let feedbackKey = '';
        let timer;
        function announce(key) {
            feedbackKey = key;
            feedback.textContent = key ? t(key) : '';
            feedback.dataset.state = key === 'dependency.copyFailed' ? 'error' : '';
        }
        button.hidden = false;
        button.addEventListener('click', async () => {
            if (busy) return;
            busy = true;
            button.setAttribute('aria-busy', 'true');
            clearTimeout(timer);
            announce('');
            try {
                const copied = await window.SiteClipboard.writeText(code.textContent);
                if (!copied) {
                    example.open = true;
                    window.SiteClipboard.selectCode(code);
                }
                announce(copied ? 'examples.copied' : 'dependency.copyFailed');
                if (copied) timer = setTimeout(() => announce(''), 3500);
            } finally {
                busy = false;
                button.removeAttribute('aria-busy');
            }
        });
        document.addEventListener('languagechange', () => {
            if (feedbackKey) announce(feedbackKey);
        });
    });
})();

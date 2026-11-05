(() => {
    'use strict';
    const api = window.SiteDependencyFormats;
    if (!api || !window.SiteClipboard) return;
    const t = key => window.siteI18n?.t(key) ?? window.SITE_TRANSLATIONS?.['zh-CN']?.[key] ?? key;

    document.querySelectorAll('[data-dependency]').forEach(widget => {
        const { groupId, artifactId } = widget.dataset;
        const version = widget.querySelector('[data-dependency-version]');
        const tabs = [...widget.querySelectorAll('[data-dependency-tab]')];
        const panels = [...widget.querySelectorAll('[data-dependency-panel]')];
        const feedback = widget.querySelector('[data-dependency-feedback]');
        let selected = 'maven';
        let feedbackKey = '';
        let revision = 0;
        let copying = false;
        let resetTimer;

        function announce(key) {
            feedbackKey = key;
            feedback.textContent = key ? t(key) : '';
            feedback.dataset.state = key === 'dependency.copyFailed' ? 'error' : '';
        }

        function clearFeedback() {
            revision++;
            clearTimeout(resetTimer);
            announce('');
        }

        function activate(format, focus = false) {
            selected = format;
            clearFeedback();
            for (const tab of tabs) {
                const active = tab.dataset.dependencyTab === format;
                tab.setAttribute('aria-selected', String(active));
                tab.tabIndex = active ? 0 : -1;
                if (active && focus) tab.focus();
            }
            for (const panel of panels) panel.hidden = panel.dataset.dependencyPanel !== format;
        }

        function renderVersion() {
            clearFeedback();
            for (const panel of panels) {
                const code = panel.querySelector('code');
                if (code) code.textContent = api.snippet(panel.dataset.dependencyPanel, groupId, artifactId, version.value);
            }
            widget.querySelectorAll('[data-dependency-download]').forEach(link => {
                const ext = link.dataset.dependencyDownload;
                link.href = api.downloadUrl(groupId, artifactId, version.value, ext);
                link.querySelector('[translate="no"]').textContent = `${artifactId}-${version.value}.${ext}`;
            });
        }

        async function copyPanel(panel) {
            if (copying) return;
            copying = true;
            clearFeedback();
            const copyRevision = revision;
            const code = panel.querySelector('code');
            const text = code.textContent;
            const button = panel.querySelector('[data-dependency-copy]');
            button.setAttribute('aria-busy', 'true');
            try {
                const copied = await window.SiteClipboard.writeText(text);
                // A previous copy must not report success for a newly selected snippet.
                if (copyRevision !== revision) return;
                if (!copied) window.SiteClipboard.selectCode(code);
                announce(copied ? 'dependency.copied' : 'dependency.copyFailed');
                if (copied) resetTimer = setTimeout(() => announce(''), 3500);
            } finally {
                copying = false;
                button.removeAttribute('aria-busy');
            }
        }

        tabs.forEach((tab, index) => {
            tab.addEventListener('click', () => activate(tab.dataset.dependencyTab));
            tab.addEventListener('keydown', event => {
                let next;
                if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
                if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
                if (event.key === 'Home') next = 0;
                if (event.key === 'End') next = tabs.length - 1;
                if (next === undefined) return;
                event.preventDefault();
                activate(tabs[next].dataset.dependencyTab, true);
            });
        });
        panels.forEach(panel => {
            const tab = tabs.find(item => item.dataset.dependencyTab === panel.dataset.dependencyPanel);
            panel.setAttribute('role', 'tabpanel');
            panel.setAttribute('aria-labelledby', tab.id);
            panel.tabIndex = 0;
            const button = panel.querySelector('[data-dependency-copy]');
            if (button) {
                button.hidden = false;
                button.addEventListener('click', () => copyPanel(panel));
            }
        });
        version.addEventListener('change', renderVersion);
        document.addEventListener('languagechange', () => {
            if (feedbackKey) announce(feedbackKey);
        });
        renderVersion();
        activate(selected);
        widget.querySelector('.dependency-version').hidden = false;
        widget.querySelector('.dependency-tabs').hidden = false;
    });
})();

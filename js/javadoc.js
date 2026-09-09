(() => {
    'use strict';
    const api = window.siteJavadoc;
    if (!api) return;
    document.querySelectorAll('[data-javadoc]').forEach(root => {
        const status = root.querySelector('[data-javadoc-status]');
        const heading = root.querySelector('[data-javadoc-heading]');
        const description = root.querySelector('[data-javadoc-description]');
        const retry = root.querySelector('[data-javadoc-retry]');
        const version = root.querySelector('[data-javadoc-version]');
        const versionLabel = root.querySelector('[data-javadoc-version-label]');
        const checked = root.querySelector('[data-javadoc-checked]');
        const checkedLabel = root.querySelector('[data-javadoc-checked-label]');
        const fixed = root.querySelector('[data-javadoc-fixed]');
        let running = false;
        const translate = (node, key) => {
            node.dataset.i18n = key;
            node.textContent = window.siteI18n?.t(key) || window.SITE_TRANSLATIONS?.['zh-CN']?.[key] || key;
        };
        async function refresh() {
            if (running) return;
            running = true;
            retry.disabled = true;
            status.dataset.javadocStatus = 'checking';
            status.setAttribute('aria-busy', 'true');
            translate(heading, 'javadoc.checking');
            translate(description, 'javadoc.checkingDescription');
            translate(versionLabel, 'javadoc.snapshotVersion');
            translate(checkedLabel, 'javadoc.snapshotChecked');
            const result = await api.check(root.dataset.groupId, root.dataset.artifactId);
            if (result.status === 'available') {
                version.textContent = result.version;
                translate(versionLabel, 'javadoc.version');
                checked.dateTime = result.checkedAt;
                checked.textContent = result.checkedAt.slice(0, 19).replace('T', ' ') + ' UTC';
                translate(checkedLabel, 'javadoc.checked');
                fixed.href = `${api.urls(root.dataset.groupId, root.dataset.artifactId).doc}/${encodeURIComponent(result.version)}`;
                fixed.hidden = false;
            }
            // Failed checks retain the last confirmed version and its timestamp.
            status.dataset.javadocStatus = result.status;
            translate(heading, `javadoc.${result.status}`);
            translate(description, `javadoc.${result.status}Description`);
            status.setAttribute('aria-busy', 'false');
            retry.disabled = false;
            running = false;
        }
        retry.hidden = false;
        retry.addEventListener('click', refresh);
        refresh();
    });
})();

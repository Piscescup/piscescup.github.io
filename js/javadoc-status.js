(function (global) {
    'use strict';
    const coordinate = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/;
    const version = /^[A-Za-z0-9][A-Za-z0-9_.+-]*$/;

    function urls(groupId, artifactId) {
        if (![groupId, artifactId].every(value => typeof value === 'string' && coordinate.test(value))) {
            throw new Error('Invalid Javadoc coordinates.');
        }
        const path = `${encodeURIComponent(groupId)}/${encodeURIComponent(artifactId)}`;
        // javadoc.io HTML and badge redirects do not allow browser CORS.
        // Shields reads the official badge server-side and exposes its title as JSON.
        const probe = new URL('https://img.shields.io/badge/dynamic/xml.json');
        probe.search = new URLSearchParams({
            url: `https://javadoc.io/badge2/${path}/javadoc.svg`,
            query: 'string(//*[local-name()="svg"]/*[local-name()="title"])',
            label: 'javadoc',
            cacheSeconds: '300'
        });
        return {
            doc: `https://javadoc.io/doc/${path}`,
            versions: `https://javadoc.io/versions/${path}`,
            probe: probe.href
        };
    }

    function parseBadge(data) {
        if (data?.label !== 'javadoc' || typeof data.message !== 'string') {
            throw new Error('Unexpected Javadoc response.');
        }
        const match = /^javadoc: (.+)$/.exec(data.message.trim());
        if (!match) throw new Error('Javadoc lookup failed.');
        const found = match[1];
        // "unknown" is the official badge response for an unrecognized artifact.
        // It is not proof that documentation has never been published.
        if (found === 'unknown') return { status: 'unknown' };
        if (!version.test(found) || !/\d/.test(found) || /^(?:latest|undefined|null)$/i.test(found)) {
            throw new Error('Invalid Javadoc version.');
        }
        return { status: 'available', version: found };
    }

    async function check(groupId, artifactId, { fetcher = global.fetch, timeoutMs = 10000 } = {}) {
        const controller = new AbortController();
        let timeout;
        try {
            const result = await Promise.race([
                (async () => {
                    const response = await fetcher(urls(groupId, artifactId).probe, {
                        signal: controller.signal, cache: 'no-store', credentials: 'omit'
                    });
                    if (!response.ok) throw new Error('Javadoc lookup HTTP error.');
                    return parseBadge(await response.json());
                })(),
                new Promise((_, reject) => {
                    timeout = setTimeout(() => {
                        controller.abort();
                        reject(new Error('Javadoc lookup timed out.'));
                    }, timeoutMs);
                })
            ]);
            return { ...result, checkedAt: new Date().toISOString() };
        } catch {
            return { status: 'error' };
        } finally {
            clearTimeout(timeout);
        }
    }

    global.siteJavadoc = { urls, parseBadge, check };
})(globalThis);

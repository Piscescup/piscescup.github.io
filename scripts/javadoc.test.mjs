import test from 'node:test';
import assert from 'node:assert/strict';
import '../js/javadoc-status.js';

const { urls, parseBadge, check } = globalThis.siteJavadoc;
const group = 'io.github.piscescup';
const artifact = 'linq-for-java';
const badge = message => ({ label: 'javadoc', message });

test('Javadoc lookup uses the official badge through a CORS-readable endpoint', () => {
    const result = urls(group, artifact);
    assert.equal(result.doc, 'https://javadoc.io/doc/io.github.piscescup/linq-for-java');
    const probe = new URL(result.probe);
    assert.equal(probe.origin, 'https://img.shields.io');
    assert.equal(probe.searchParams.get('url'), 'https://javadoc.io/badge2/io.github.piscescup/linq-for-java/javadoc.svg');
    for (const invalid of ['..', '../other', 'a/b', '', undefined]) assert.throws(() => urls(group, invalid));
});

test('published documentation versions and qualifiers are recognized', () => {
    for (const version of ['1.0.0', '1.1.2', '2.0.0-RC1', 'v3.1', '1.0+build.5']) {
        assert.deepEqual(parseBadge(badge(`javadoc: ${version}`)), { status: 'available', version });
    }
    assert.deepEqual(parseBadge(badge('javadoc: unknown')), { status: 'unknown' });
});

test('upstream errors, malformed data and unsafe versions never indicate availability', () => {
    for (const response of [null, {}, { label: '404', message: 'badge not found' }, badge('invalid'), badge('inaccessible'), badge('javadoc: latest'), badge('javadoc: ../1'), badge('javadoc: 1<script>'), badge('javadoc: 1/other'), badge(100)]) {
        assert.throws(() => parseBadge(response));
    }
});

test('loading obtains new versions on each visit instead of trusting a stored snapshot', async () => {
    let call = 0;
    const fetcher = async (url, options) => {
        assert.equal(options.cache, 'no-store');
        assert.equal(options.credentials, 'omit');
        return { ok: true, json: async () => badge(`javadoc: ${++call}.0.0`) };
    };
    const first = await check(group, artifact, { fetcher });
    const second = await check(group, artifact, { fetcher });
    assert.equal(first.version, '1.0.0');
    assert.equal(second.version, '2.0.0');
    assert(Number.isFinite(Date.parse(second.checkedAt)));
});

test('network errors, HTTP errors and invalid JSON remain errors, not missing docs', async () => {
    const fetchers = [
        async () => { throw new TypeError('Failed to fetch'); },
        async () => ({ ok: false, status: 503 }),
        async () => ({ ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); } }),
        async () => ({ ok: true, json: async () => badge('upstream unavailable') })
    ];
    for (const fetcher of fetchers) assert.deepEqual(await check(group, artifact, { fetcher }), { status: 'error' });
    const result = await check(group, artifact, { fetcher: async () => ({ ok: true, json: async () => badge('javadoc: unknown') }) });
    assert.equal(result.status, 'unknown');
    assert.equal(result.version, undefined);
});

test('a stalled response times out and aborts the request', async () => {
    let signal;
    const fetcher = async (_, options) => {
        signal = options.signal;
        return { ok: true, json: () => new Promise(() => {}) };
    };
    assert.deepEqual(await check(group, artifact, { fetcher, timeoutMs: 15 }), { status: 'error' });
    assert(signal.aborted);
});

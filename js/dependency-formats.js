// Shared by the static generator and browser. No fetch, packages or module loader needed.
(() => {
    'use strict';
    const formats = Object.freeze([
        { id: 'maven', label: 'Maven', file: 'pom.xml' },
        { id: 'gradle', label: 'Gradle', file: 'build.gradle' },
        { id: 'kotlin', label: 'Gradle Kotlin', file: 'build.gradle.kts' },
        { id: 'ivy', label: 'Ivy', file: 'ivy.xml' }
    ].map(Object.freeze));

    function snippet(format, groupId, artifactId, version) {
        const coordinate = `${groupId}:${artifactId}:${version}`;
        switch (format) {
            case 'maven': return `<dependency>\n    <groupId>${groupId}</groupId>\n    <artifactId>${artifactId}</artifactId>\n    <version>${version}</version>\n</dependency>`;
            case 'gradle': return `repositories {\n    mavenCentral()\n}\n\ndependencies {\n    implementation '${coordinate}'\n}`;
            case 'kotlin': return `repositories {\n    mavenCentral()\n}\n\ndependencies {\n    implementation("${coordinate}")\n}`;
            case 'ivy': return `<dependency org="${groupId}" name="${artifactId}" rev="${version}" conf="default->default" />`;
            default: throw new Error(`Unknown dependency format: ${format}`);
        }
    }

    function downloadUrl(groupId, artifactId, version, extension) {
        return `https://repo.maven.apache.org/maven2/${groupId.replaceAll('.', '/')}/${artifactId}/${version}/${artifactId}-${version}.${extension}`;
    }

    globalThis.SiteDependencyFormats = Object.freeze({ formats, snippet, downloadUrl });
})();

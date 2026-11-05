(() => {
    'use strict';
    async function writeText(text) {
        if (navigator.clipboard?.writeText) {
            try { await navigator.clipboard.writeText(text); return true; } catch { /* Try legacy copying. */ }
        }
        const focused = document.activeElement;
        const field = document.createElement('textarea');
        field.value = text;
        field.readOnly = true;
        field.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none';
        document.body.append(field);
        field.select();
        let copied = false;
        try { copied = document.execCommand('copy'); } catch { /* Manual selection remains available. */ }
        field.remove();
        focused?.focus({ preventScroll: true });
        return copied;
    }
    function selectCode(code) {
        code.closest('pre').focus({ preventScroll: true });
        const range = document.createRange();
        range.selectNodeContents(code);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }
    window.SiteClipboard = Object.freeze({ writeText, selectCode });
})();

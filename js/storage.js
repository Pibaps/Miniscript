const Storage = (() => {
    const KEYS = {
        THEME: 'app_theme',
        CONTENT: 'app_editor_content',
        WEBHOOK: 'app_webhook_url'
    };

    function set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            // Fallback to cookie
            const d = new Date();
            d.setTime(d.getTime() + 365 * 24 * 60 * 60 * 1000);
            document.cookie = `${key}=${encodeURIComponent(JSON.stringify(value))};expires=${d.toUTCString()};path=/;SameSite=Lax`;
        }
    }

    function get(key, fallback = null) {
        try {
            const val = localStorage.getItem(key);
            if (val !== null) return JSON.parse(val);
        } catch (e) {
            // Fallback: read cookie
            const match = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)'));
            if (match) {
                try { return JSON.parse(decodeURIComponent(match[2])); } catch (_) {}
            }
        }
        return fallback;
    }

    function remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }
    }

    return { KEYS, set, get, remove };
})();
// Utilities
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function setStatus(text) {
    const el = document.getElementById('status-text');
    const dot = document.querySelector('.status-dot');

    if (el) el.textContent = text;

    // Update dot color and glow based on status
    if (dot) {
        if (text === 'Connected') {
            dot.style.backgroundColor = 'var(--success)';
            dot.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.2)';
        } else if (text === 'Disconnected' || text === 'Connection error') {
            dot.style.backgroundColor = 'var(--danger)';
            dot.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.2)';
        } else {
            // Waiting for backend, Connecting, etc.
            dot.style.backgroundColor = 'var(--warning)';
            dot.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.2)';
        }
    }
}

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 10) / 10 + ' ' + sizes[i];
}

// ── API Response Cache ──────────────────────────────────────────────────────
const _apiCache = new Map(); // url → parsed JSON value

function _cacheFlushByPrefix(prefix) { _apiCache.forEach((_, k) => { if (k.startsWith(prefix)) _apiCache.delete(k); }); }

async function jsonGet(url) {
    if (_apiCache.has(url)) return _apiCache.get(url);
    const res = await fetch(url);
    if (!res.ok) {
        let errorMessage = `HTTP ${res.status}`;
        try { const text = await res.text(); if (text) errorMessage += `: ${text}`; } catch (e) { /* ignore */ }
        throw new Error(errorMessage);
    }
    const data = await res.json();
    _apiCache.set(url, data);
    return data;
}

async function jsonPost(url, body) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        let errorMessage = `HTTP ${res.status}`;
        try { const text = await res.text(); if (text) errorMessage += `: ${text}`; } catch (e) { /* ignore */ }
        throw new Error(errorMessage);
    }
    // ── Cache invalidation ──────────────────────────────────────────────────
    const endpoint = url.split('?')[0].split('/').pop();
    if (endpoint === 'edittag' || endpoint === 'addfieldtag' || endpoint === 'removefieldtag') {
        // Flush cached tags for the specific file path
        const filePath = body?.path ?? body?.filePath;
        if (filePath) { const key = `${APIBASE}/api/tag?path=${encodeURIComponent(filePath)}`; _apiCache.delete(key); }
    } else if (endpoint === 'delete') {
        // Flush cached history for the RTEID
        const rteid = body?.path;
        if (rteid) { const key = `${APIBASE}/api/gethistory?path=${encodeURIComponent(rteid)}`; _apiCache.delete(key); }
    } else if (endpoint === 'mkdir' || endpoint === 'rename' || endpoint === 'store') {
        // Flush all directory listings
        _cacheFlushByPrefix(`${APIBASE}/api/list`);
    }
    return res;
}


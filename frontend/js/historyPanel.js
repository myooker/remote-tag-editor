// History Panel
let historyPanelFilePath = null;

function openHistoryPanel(filePath) {
    historyPanelFilePath = filePath;
    const overlay = document.getElementById('history-panel-overlay');
    overlay.classList.add('visible');
    loadHistory(filePath);
}

function closeHistoryPanel() {
    const overlay = document.getElementById('history-panel-overlay');
    overlay.classList.remove('visible');
    historyPanelFilePath = null;
}

async function loadHistory(filePath) {
    const content = document.getElementById('history-panel-content');
    const title = document.getElementById('history-panel-filename');
    title.textContent = filePath.split('/').pop();
    content.innerHTML = `
        <div class="history-loading">
            <div class="history-spinner"></div>
            <span>Loading history...</span>
        </div>`;
    try {
        const history = await jsonGet(`${APIBASE}/api/gethistory?path=${encodeURIComponent(filePath)}`);
        renderHistory(history);
    } catch (err) {
        console.error('Failed to load history', err);
        content.innerHTML = `
            <div class="history-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <p>Failed to load history</p>
            </div>`;
    }
}

function renderHistory(history) {
    const content = document.getElementById('history-panel-content');
    content.innerHTML = '';

    if (!Array.isArray(history) || history.length === 0) {
        content.innerHTML = `
            <div class="history-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <p>No history yet</p>
                <span>Changes will appear here after you edit tags</span>
            </div>`;
        return;
    }

    const list = document.createElement('div');
    list.className = 'history-list';

    history.forEach((entry, idx) => {
        const item = document.createElement('div');
        item.className = `history-item history-action-${entry.action}`;
        item.style.animationDelay = `${idx * 30}ms`;

        const actionLabel = { add: 'Added', remove: 'Removed', change: 'Changed' }[entry.action] ?? entry.action;
        const actionClass = { add: 'badge-add', remove: 'badge-remove', change: 'badge-change' }[entry.action] ?? '';

        const date = new Date(entry.changed_at.replace(' ', 'T') + 'Z');
        const formattedDate = isNaN(date.getTime()) ? entry.changed_at : date.toLocaleString();

        item.innerHTML = `
            <div class="history-item-header">
                <span class="history-badge ${actionClass}">${actionLabel}</span>
                <span class="history-tag-name">${escapeHtml(entry.tag)}</span>
                <span class="history-date">${formattedDate}</span>
            </div>
            <div class="history-item-body">
                ${entry.action === 'change' ? `
                    <div class="history-value history-old">
                        <span class="history-value-label">Before</span>
                        <span class="history-value-text">${escapeHtml(entry.old_value ?? '')}</span>
                    </div>
                    <svg class="history-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                    <div class="history-value history-new">
                        <span class="history-value-label">After</span>
                        <span class="history-value-text">${escapeHtml(entry.new_value ?? '')}</span>
                    </div>
                ` : entry.action === 'add' ? `
                    <div class="history-value history-new">
                        <span class="history-value-label">Value</span>
                        <span class="history-value-text">${escapeHtml(entry.new_value ?? '')}</span>
                    </div>
                ` : `
                    <div class="history-value history-old">
                        <span class="history-value-label">Value</span>
                        <span class="history-value-text">${escapeHtml(entry.old_value ?? '')}</span>
                    </div>
                `}
            </div>`;

        list.appendChild(item);
    });

    content.appendChild(list);
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Init listeners after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('history-panel-close').addEventListener('click', closeHistoryPanel);
    document.getElementById('history-panel-overlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeHistoryPanel(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeHistoryPanel(); });
});

// Mount Point Loading
async function pollMountPoint() {
    while (!mountPoint) {
        try {
            const data = await jsonGet(`${APIBASE}/api/getmntpoint`);
            mountPoint = data.path;
            currentPath = mountPoint;
            setStatus('Connected');
            document.getElementById('mountpoint-label').textContent = mountPoint;
            await loadDirectory(mountPoint, true);
            break;
        } catch (e) {
            setStatus('Waiting for backend...');
            await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
        }
    }

    // Start periodic health check
    startHealthCheck();
}

// Periodic backend health check
function startHealthCheck() {
    setInterval(async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const res = await fetch(`${APIBASE}/api/heartbeat`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                setStatus('Connected');
            } else {
                setStatus('Connection error');
            }
        } catch (e) {
            setStatus('Disconnected');
        }
    }, POLL_INTERVAL_MS);
}

// Navigation Buttons
document.getElementById('back-btn').addEventListener('click', () => {
    if (historyIndex > 0) {
        historyIndex--;
        const path = navigationHistory[historyIndex];
        loadDirectory(path, false);
    }
});

document.getElementById('up-btn').addEventListener('click', () => {
    if (currentPath && currentPath !== mountPoint) {
        const parts = currentPath.split('/').filter(Boolean);
        parts.pop();
        const parentPath = '/' + parts.join('/');
        loadDirectory(parentPath);
    }
});

document.getElementById('refresh-btn').addEventListener('click', () => {
    if (currentPath) {
        loadDirectory(currentPath, false);
        showToast('Refreshed', 'success');
    }
});

// Search
document.getElementById('search-input').addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    const rows = document.querySelectorAll('#file-table-body tr');
    rows.forEach((row) => {
        const name = row.querySelector('.file-name')?.textContent.toLowerCase();
        row.style.display = name && name.includes(query) ? '' : 'none';
    });
});

// Icon Size Control
document.getElementById('icon-size-range').addEventListener('input', (e) => {
    const size = Number(e.target.value);
    document.documentElement.style.setProperty('--icon-size', size + 'px');
});

// Keyboard Navigation
document.addEventListener('keydown', (e) => {
    // Ctrl+F: Focus search box
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
        return;
    }

    // Don't interfere with input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }

    const allRows = Array.from(document.querySelectorAll('#file-table-body tr'));

    // Ctrl+A: Select all music files only
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const musicRows = allRows.filter(r => r.dataset.type === 'music');
        allRows.forEach(r => r.classList.remove('selected'));
        musicRows.forEach(r => r.classList.add('selected'));
        selectedFiles = musicRows.map(row => {
            const path = row.dataset.path;
            const type = row.dataset.type;
            const extension = row.dataset.extension;
            const name = row.querySelector('.file-name')?.textContent;
            return { path, type, extension, name };
        });
        if (selectedFiles.length > 0) {
            lastSelectedIndex = allRows.indexOf(musicRows[musicRows.length - 1]);
            updateTagPanelForSelection();
        }
        return;
    }

    // Escape: Clear selection
    if (e.key === 'Escape') {
        e.preventDefault();
        allRows.forEach(r => r.classList.remove('selected'));
        selectedFiles = [];
        lastSelectedIndex = -1;
        clearTags();
        return;
    }

    // Arrow keys: Navigate
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (allRows.length === 0) return;

        let currentIndex = lastSelectedIndex;

        if (currentIndex === -1) {
            currentIndex = e.key === 'ArrowDown' ? 0 : allRows.length - 1;
        } else {
            const previousIndex = currentIndex;
            currentIndex = e.key === 'ArrowDown'
                ? Math.min(currentIndex + 1, allRows.length - 1)
                : Math.max(currentIndex - 1, 0);

            if (e.shiftKey && previousIndex !== currentIndex) {
                const previousRow = allRows[previousIndex];
                const targetRow = allRows[currentIndex];
                if (targetRow.classList.contains('selected') && previousRow.classList.contains('selected')) {
                    previousRow.classList.remove('selected');
                    const previousPath = previousRow.dataset.path;
                    selectedFiles = selectedFiles.filter(f => f.path !== previousPath);
                    lastSelectedIndex = currentIndex;
                    targetRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    updateTagPanelForSelection();
                    return;
                }
            }
        }

        const targetRow = allRows[currentIndex];
        const targetPath = targetRow.dataset.path;
        const targetType = targetRow.dataset.type;
        const targetExt = targetRow.dataset.extension;
        const targetName = targetRow.querySelector('.file-name')?.textContent;

        if (!e.shiftKey) {
            allRows.forEach(r => r.classList.remove('selected'));
            targetRow.classList.add('selected');
            selectedFiles = [{ path: targetPath, type: targetType, extension: targetExt, name: targetName }];
            lastSelectedIndex = currentIndex;
        } else {
            if (!targetRow.classList.contains('selected')) {
                targetRow.classList.add('selected');
                selectedFiles.push({ path: targetPath, type: targetType, extension: targetExt, name: targetName });
            }
            lastSelectedIndex = currentIndex;
        }

        targetRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        updateTagPanelForSelection();
        return;
    }

    // Enter: Open directory
    if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedFiles.length === 1 && selectedFiles[0].type === 'directory') {
            loadDirectory(selectedFiles[0].path);
        }
        return;
    }
});

// Initialize
pollMountPoint();

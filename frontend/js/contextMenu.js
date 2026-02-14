// Context Menu
const contextMenu = document.getElementById('context-menu');
let contextTarget = null;

function openContextMenu(x, y, target) {
    contextTarget = target;
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.classList.add('visible');
}

function closeContextMenu() {
    contextMenu.classList.remove('visible');
    contextTarget = null;
}

contextMenu.addEventListener('click', async (e) => {
    const item = e.target.closest('.context-item');
    if (!item) return;
    const action = item.dataset.action;

    const targetElement = contextTarget;
    closeContextMenu();

    try {
        if (action === 'mkdir') {
            const name = await showModal('New Folder', 'Enter folder name');
            if (!name) return;
            await jsonPost(`${APIBASE}/api/mkdir`, { path: currentPath, name });
            showToast('Folder created', 'success');
            await loadDirectory(currentPath, false);
        } else if (action === 'rename') {
            if (!targetElement) {
                showToast('No file selected for rename', 'error');
                return;
            }
            const oldName = targetElement.querySelector('.file-name')?.textContent;
            if (!oldName) {
                showToast('Cannot determine file name', 'error');
                return;
            }
            const newName = await showModal('Rename', 'Enter new name', oldName);
            if (!newName) return;
            if (newName === oldName) return;

            const path = targetElement.dataset.path;
            await jsonPost(`${APIBASE}/api/rename`, { path, newName });
            showToast('Renamed successfully', 'success');
            await loadDirectory(currentPath, false);
        }
    } catch (err) {
        console.error('Operation failed', err);
        showToast('Operation failed: ' + err.message, 'error');
    }
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.context-menu')) {
        closeContextMenu();
    }
});

document.getElementById('explorer-content').addEventListener('contextmenu', (e) => {
    if (!e.target.closest('tr')) {
        e.preventDefault();
        openContextMenu(e.clientX, e.clientY, null);
    }
});

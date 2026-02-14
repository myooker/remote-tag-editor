// Config
//const APIBASE = "http://demo.tag.fent.labs";
const APIBASE = "http://localhost:18080";
const POLL_INTERVAL_MS = 5000;

// State
let mountPoint = null;
let currentPath = null;
let navigationHistory = [];
let historyIndex = -1;
let fileTreeData = null;
let selectedFile = null;
let currentTags = null;
let dragDepth = 0;

// Upload Progress State
let uploadState = {
    totalFiles: 0,
    uploadedFiles: 0,
    isUploading: false
};

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
    if (el) el.textContent = text;
}

function updateBreadcrumb(path) {
    const breadcrumb = document.getElementById('breadcrumb');
    if (!breadcrumb) return;
    breadcrumb.innerHTML = '';
    if (!path || path === mountPoint) {
        const item = document.createElement('span');
        item.className = 'breadcrumb-item';
        item.textContent = 'Home';
        breadcrumb.appendChild(item);
        return;
    }
    const relative = path.replace(mountPoint, '').split('/').filter(Boolean);
    relative.forEach((part, idx) => {
        if (idx > 0) {
            const sep = document.createElement('span');
            sep.textContent = ' / ';
            sep.style.color = 'var(--text-muted)';
            breadcrumb.appendChild(sep);
        }
        const item = document.createElement('span');
        item.className = 'breadcrumb-item';
        item.textContent = part;
        breadcrumb.appendChild(item);
    });
}

function updateNavigationButtons() {
    const backBtn = document.getElementById('back-btn');
    const upBtn = document.getElementById('up-btn');
    backBtn.disabled = historyIndex <= 0;
    upBtn.disabled = !currentPath || currentPath === mountPoint;
}

async function jsonGet(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

async function jsonPost(url, body) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
}

// Modal Dialog - Enhanced to support confirmation mode
function showModal(title, placeholder = '', defaultValue = '', isConfirmation = false) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('modal-overlay');
        const dialog = document.getElementById('modal-dialog');
        const titleEl = document.getElementById('modal-title');
        const input = document.getElementById('modal-input');
        const okBtn = document.getElementById('modal-ok');
        const cancelBtn = document.getElementById('modal-cancel');
        const closeBtn = document.getElementById('modal-close');

        titleEl.textContent = title;

        if (isConfirmation) {
            // Hide input for confirmation dialogs
            input.style.display = 'none';
            // Use placeholder as the message
            if (placeholder) {
                const messageDiv = document.createElement('div');
                messageDiv.id = 'modal-message';
                messageDiv.style.fontSize = '14px';
                messageDiv.style.color = 'var(--text-primary)';
                messageDiv.style.lineHeight = '1.6';
                messageDiv.style.marginBottom = '8px';
                messageDiv.textContent = placeholder;
                input.parentNode.insertBefore(messageDiv, input);
            }
            okBtn.textContent = 'Remove';
            okBtn.style.background = 'var(--danger)';
        } else {
            input.style.display = 'block';
            input.placeholder = placeholder;
            input.value = defaultValue;
            okBtn.textContent = 'OK';
            okBtn.style.background = 'var(--accent)';
        }

        overlay.classList.add('visible');

        if (!isConfirmation) {
            setTimeout(() => input.focus(), 100);
        }

        // Make dialog draggable
        let isDragging = false;
        let currentX, currentY, initialX, initialY;

        const dragStart = (e) => {
            if (e.target === titleEl || e.target.closest('.modal-header')) {
                isDragging = true;
                initialX = e.clientX - dialog.offsetLeft;
                initialY = e.clientY - dialog.offsetTop;
            }
        };

        const drag = (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                dialog.style.left = currentX + 'px';
                dialog.style.top = currentY + 'px';
                dialog.style.transform = 'none';
            }
        };

        const dragEnd = () => {
            isDragging = false;
        };

        dialog.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        const cleanup = () => {
            overlay.classList.remove('visible');
            dialog.removeEventListener('mousedown', dragStart);
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', dragEnd);
            dialog.style.left = '';
            dialog.style.top = '';
            dialog.style.transform = '';
            // Clean up confirmation message if exists
            const messageDiv = document.getElementById('modal-message');
            if (messageDiv) messageDiv.remove();
        };

        const handleOk = () => {
            if (isConfirmation) {
                cleanup();
                resolve(true);
            } else {
                const value = input.value.trim();
                cleanup();
                resolve(value || null);
            }
        };

        const handleCancel = () => {
            cleanup();
            resolve(isConfirmation ? false : null);
        };

        okBtn.onclick = handleOk;
        cancelBtn.onclick = handleCancel;
        closeBtn.onclick = handleCancel;

        if (!isConfirmation) {
            input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleOk();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCancel();
                }
            };
        }
    });
}

// Upload Progress
function showUploadProgress() {
    const container = document.getElementById('upload-progress-container');
    container.classList.add('visible');
    uploadState.isUploading = true;
}

function hideUploadProgress() {
    const container = document.getElementById('upload-progress-container');
    container.classList.remove('visible');
    uploadState.isUploading = false;
    uploadState.totalFiles = 0;
    uploadState.uploadedFiles = 0;
}

function updateUploadProgress() {
    const fill = document.getElementById('upload-progress-fill');
    const details = document.getElementById('upload-progress-details');
    const text = document.getElementById('upload-progress-text');

    const percentage = uploadState.totalFiles > 0 
        ? (uploadState.uploadedFiles / uploadState.totalFiles) * 100 
        : 0;

    fill.style.width = percentage + '%';
    details.textContent = `${uploadState.uploadedFiles} / ${uploadState.totalFiles} files`;

    if (uploadState.uploadedFiles >= uploadState.totalFiles && uploadState.totalFiles > 0) {
        text.textContent = 'Upload complete!';
        setTimeout(() => {
            hideUploadProgress();
        }, 2000);
    } else {
        text.textContent = 'Uploading files...';
    }
}

document.getElementById('upload-close-btn').addEventListener('click', () => {
    if (!uploadState.isUploading || uploadState.uploadedFiles >= uploadState.totalFiles) {
        hideUploadProgress();
    }
});

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
}

async function loadDirectory(path, addToHistory = true) {
    try {
        const res = await fetch(`${APIBASE}/api/list?path=${encodeURIComponent(path)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const tree = await res.json();
        fileTreeData = tree;
        currentPath = path;
        if (addToHistory) {
            navigationHistory = navigationHistory.slice(0, historyIndex + 1);
            navigationHistory.push(path);
            historyIndex = navigationHistory.length - 1;
        }
        renderFileList(tree);
        updateBreadcrumb(path);
        updateNavigationButtons();
    } catch (err) {
        console.error('Failed to load directory', err);
        showToast('Failed to load directory', 'error');
    }
}

// File List Rendering
function getFileIcon(type) {
    if (type === 'music') return '';
    switch (type) {
        case 'directory': return '📁';
        case 'picture': return '🖼️';
        default: return '📄';
    }
}

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 10) / 10 + ' ' + sizes[i];
}

function getFileType(node) {
    if (node.type === 'directory') return 'Folder';
    if (node.type === 'music') return 'Audio File';
    if (node.type === 'picture') return 'Image';
    if (node.extension) return node.extension.toUpperCase() + ' File';
    return 'File';
}

function renderFileList(tree) {
    const tbody = document.getElementById('file-table-body');
    tbody.innerHTML = '';
    if (!tree || !tree.content || tree.content.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 3;
        td.style.textAlign = 'center';
        td.style.color = 'var(--text-muted)';
        td.style.padding = '48px';
        td.textContent = 'This folder is empty';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }
    const sorted = [...tree.content].sort((a, b) => {
        if (a.type === 'directory' && b.type !== 'directory') return -1;
        if (a.type !== 'directory' && b.type === 'directory') return 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
    sorted.forEach(node => {
        const tr = document.createElement('tr');
        const fullPath = node.name.startsWith('/') ? node.name : `${currentPath}/${node.name}`;
        tr.dataset.path = fullPath;
        tr.dataset.type = node.type;
        if (node.extension) tr.dataset.extension = node.extension;

        const tdName = document.createElement('td');
        const nameCell = document.createElement('div');
        nameCell.className = 'file-name-cell';
        const icon = document.createElement('div');
        icon.className = `file-icon ${node.type}`;
        icon.textContent = getFileIcon(node.type);
        const name = document.createElement('span');
        name.className = 'file-name';
        name.textContent = node.name.split('/').pop();
        nameCell.appendChild(icon);
        nameCell.appendChild(name);
        tdName.appendChild(nameCell);

        const tdType = document.createElement('td');
        tdType.className = 'file-type';
        tdType.textContent = getFileType(node);

        const tdSize = document.createElement('td');
        tdSize.className = 'file-size';
        tdSize.textContent = node.type === 'directory' ? '-' : formatBytes(node.size);

        tr.appendChild(tdName);
        tr.appendChild(tdType);
        tr.appendChild(tdSize);

        tr.addEventListener('click', () => handleFileClick(tr, node));
        tr.addEventListener('dblclick', () => handleFileDoubleClick(tr, node));
        tr.addEventListener('contextmenu', (e) => handleContextMenu(e, tr, node));
        tbody.appendChild(tr);
    });
}

function handleFileClick(tr, node) {
    document.querySelectorAll('#file-table-body tr').forEach(r => r.classList.remove('selected'));
    tr.classList.add('selected');
    selectedFile = { path: tr.dataset.path, type: node.type, extension: node.extension, name: node.name, ...node };
    if (node.type === 'music') {
        loadTags(tr.dataset.path);
    } else {
        clearTags();
    }
}

function handleFileDoubleClick(tr, node) {
    if (node.type === 'directory') {
        loadDirectory(tr.dataset.path);
    }
}

function handleContextMenu(e, tr, node) {
    e.preventDefault();
    openContextMenu(e.clientX, e.clientY, tr);
}

// Tags Panel
function clearTags() {
    const panel = document.getElementById('panel-content');
    const status = document.getElementById('tag-status');
    status.textContent = 'No file selected';
    panel.innerHTML = `
        <div class="empty-state">
            <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <line x1="10" y1="9" x2="8" y2="9"></line>
            </svg>
            <p>Select a music file to view tags</p>
        </div>`;
}

async function loadTags(filePath) {
    const status = document.getElementById('tag-status');
    status.textContent = 'Loading tags...';
    try {
        const res = await fetch(`${APIBASE}/api/tag?path=${encodeURIComponent(filePath)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const tags = await res.json();
        currentTags = { path: filePath, tags };
        renderTags(tags, filePath);
        status.textContent = filePath.split('/').pop();
    } catch (err) {
        console.error('Failed to load tags', err);
        showToast('Failed to load tags', 'error');
        status.textContent = 'Error loading tags';
        const panel = document.getElementById('panel-content');
        panel.innerHTML = `
            <div class="empty-state">
                <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <p>Failed to load tags</p>
            </div>`;
    }
}

function getMusicFilesInCurrentDirectory() {
    if (!fileTreeData || !fileTreeData.content) return [];
    return fileTreeData.content
        .filter(node => node.type === 'music')
        .map(node => node.name.startsWith('/') ? node.name : `${currentPath}/${node.name}`);
}

function renderTags(tags, filePath) {
    const panel = document.getElementById('panel-content');
    panel.innerHTML = '';
    const entries = Object.entries(tags);

    const tagGroup = document.createElement('div');
    tagGroup.className = 'tag-group';

    if (entries.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.style.color = 'var(--text-muted)';
        emptyMsg.style.fontSize = '14px';
        emptyMsg.textContent = 'No tags found';
        tagGroup.appendChild(emptyMsg);
    } else {
        entries.forEach(([key, value]) => {
            if (Array.isArray(value)) {
                value.forEach((item, index) => {
                    const row = document.createElement('div');
                    row.className = 'tag-row';

                    const labelWrapper = document.createElement('div');
                    labelWrapper.className = 'tag-label-wrapper';

                    const label = document.createElement('label');
                    label.className = 'tag-label';
                    label.textContent = key;

                    const removeIcon = document.createElement('span');
                    removeIcon.className = 'tag-remove-icon';
                    removeIcon.textContent = '×';
                    removeIcon.title = 'Remove this field';
                    removeIcon.addEventListener('click', () => showRemoveFieldActions(removeIcon, filePath, key, String(item ?? '')));

                    labelWrapper.appendChild(label);
                    labelWrapper.appendChild(removeIcon);

                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'tag-input';
                    input.value = String(item ?? '');
                    input.dataset.key = key;
                    input.dataset.isArray = 'true';
                    input.dataset.arrayIndex = index;
                    input.dataset.originalValue = JSON.stringify(value);

                    const actions = document.createElement('div');
                    actions.className = 'tag-actions';

                    const btnSaveFile = document.createElement('button');
                    btnSaveFile.className = 'btn btn-primary';
                    btnSaveFile.textContent = 'Save file';
                    btnSaveFile.addEventListener('click', () => saveMultiTag(filePath, key, value, index, input.value));

                    const btnSaveFolder = document.createElement('button');
                    btnSaveFolder.className = 'btn btn-success';
                    btnSaveFolder.textContent = 'Save folder';
                    btnSaveFolder.addEventListener('click', () => saveFolderMultiTag(key, value, index, input.value));

                    const btnCancel = document.createElement('button');
                    btnCancel.className = 'btn btn-secondary';
                    btnCancel.textContent = 'Cancel';
                    btnCancel.addEventListener('click', () => {
                        input.value = String(item ?? '');
                        actions.classList.remove('visible');
                    });

                    actions.appendChild(btnSaveFile);
                    actions.appendChild(btnSaveFolder);
                    actions.appendChild(btnCancel);

                    input.addEventListener('input', () => {
                        if (input.value !== String(item ?? '')) {
                            actions.classList.add('visible');
                        } else {
                            actions.classList.remove('visible');
                        }
                    });

                    row.appendChild(labelWrapper);
                    row.appendChild(input);
                    row.appendChild(actions);
                    tagGroup.appendChild(row);
                });
            } else {
                const row = document.createElement('div');
                row.className = 'tag-row';

                const labelWrapper = document.createElement('div');
                labelWrapper.className = 'tag-label-wrapper';

                const label = document.createElement('label');
                label.className = 'tag-label';
                label.textContent = key;

                const removeIcon = document.createElement('span');
                removeIcon.className = 'tag-remove-icon';
                removeIcon.textContent = '×';
                removeIcon.title = 'Remove this field';
                removeIcon.addEventListener('click', () => showRemoveFieldActions(removeIcon, filePath, key, String(value ?? '')));

                labelWrapper.appendChild(label);
                labelWrapper.appendChild(removeIcon);

                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'tag-input';
                input.value = String(value ?? '');
                input.dataset.key = key;
                input.dataset.originalValue = JSON.stringify(value);

                const actions = document.createElement('div');
                actions.className = 'tag-actions';

                const btnSaveFile = document.createElement('button');
                btnSaveFile.className = 'btn btn-primary';
                btnSaveFile.textContent = 'Save file';
                btnSaveFile.addEventListener('click', () => saveSingleTag(filePath, key, value, input.value));

                const btnSaveFolder = document.createElement('button');
                btnSaveFolder.className = 'btn btn-success';
                btnSaveFolder.textContent = 'Save folder';
                btnSaveFolder.addEventListener('click', () => saveFolderSingleTag(key, input.value));

                const btnCancel = document.createElement('button');
                btnCancel.className = 'btn btn-secondary';
                btnCancel.textContent = 'Cancel';
                btnCancel.addEventListener('click', () => {
                    input.value = String(value ?? '');
                    actions.classList.remove('visible');
                });

                actions.appendChild(btnSaveFile);
                actions.appendChild(btnSaveFolder);
                actions.appendChild(btnCancel);

                input.addEventListener('input', () => {
                    if (input.value !== String(value ?? '')) {
                        actions.classList.add('visible');
                    } else {
                        actions.classList.remove('visible');
                    }
                });

                row.appendChild(labelWrapper);
                row.appendChild(input);
                row.appendChild(actions);
                tagGroup.appendChild(row);
            }
        });
    }

    panel.appendChild(tagGroup);

    const separator = document.createElement('div');
    separator.className = 'tag-separator';
    panel.appendChild(separator);

    const addFieldSection = document.createElement('div');
    addFieldSection.className = 'add-field-section';

    const addFieldTitle = document.createElement('div');
    addFieldTitle.className = 'add-field-title';
    addFieldTitle.textContent = 'Add New Field';
    addFieldSection.appendChild(addFieldTitle);

    const fieldTypeRow = document.createElement('div');
    fieldTypeRow.className = 'tag-row';

    const fieldTypeLabel = document.createElement('label');
    fieldTypeLabel.className = 'tag-label';
    fieldTypeLabel.textContent = 'Field Type';

    const fieldTypeInput = document.createElement('input');
    fieldTypeInput.type = 'text';
    fieldTypeInput.className = 'tag-input';
    fieldTypeInput.id = 'new-field-type';
    fieldTypeInput.placeholder = 'e.g., GENRE';

    fieldTypeRow.appendChild(fieldTypeLabel);
    fieldTypeRow.appendChild(fieldTypeInput);
    addFieldSection.appendChild(fieldTypeRow);

    const valueRow = document.createElement('div');
    valueRow.className = 'tag-row';

    const valueLabel = document.createElement('label');
    valueLabel.className = 'tag-label';
    valueLabel.textContent = 'Value';

    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.className = 'tag-input';
    valueInput.id = 'new-field-value';
    valueInput.placeholder = 'e.g., hardcore (optional)';

    valueRow.appendChild(valueLabel);
    valueRow.appendChild(valueInput);
    addFieldSection.appendChild(valueRow);

    const addFieldActions = document.createElement('div');
    addFieldActions.className = 'tag-actions visible';

    const btnAdd = document.createElement('button');
    btnAdd.className = 'btn btn-primary';
    btnAdd.textContent = 'Add';
    btnAdd.addEventListener('click', () => showAddFieldActions(btnAdd, filePath, fieldTypeInput, valueInput));

    const btnCancelAdd = document.createElement('button');
    btnCancelAdd.className = 'btn btn-secondary';
    btnCancelAdd.textContent = 'Cancel';
    btnCancelAdd.addEventListener('click', () => {
        fieldTypeInput.value = '';
        valueInput.value = '';
        // Also clean up button group if exists
        const buttonGroup = actionsContainer.querySelector('.tag-add-button-group');
        if (buttonGroup) buttonGroup.remove();
        btnAdd.style.display = '';
    });

    addFieldActions.appendChild(btnAdd);
    addFieldActions.appendChild(btnCancelAdd);
    addFieldSection.appendChild(addFieldActions);

    panel.appendChild(addFieldSection);
}

async function saveSingleTag(filePath, tagType, originalValue, newValue) {
    const status = document.getElementById('tag-status');
    status.textContent = 'Saving...';
    newValue = newValue.trim();
    if (!newValue) {
        showToast('Tag value cannot be empty', 'error');
        status.textContent = 'Error';
        return;
    }
    const payload = {
        path: filePath,
        tagType,
        replaceWith: newValue,
    };
    try {
        await jsonPost(`${APIBASE}/api/edittag`, payload);
        showToast('Tag saved successfully', 'success');
        await loadTags(filePath);
        status.textContent = 'Saved';
    } catch (err) {
        console.error('Failed to save tag', err);
        showToast('Failed to save tag', 'error');
        status.textContent = 'Error';
    }
}

async function saveFolderSingleTag(tagType, newValue) {
    const status = document.getElementById('tag-status');
    status.textContent = 'Saving to folder...';
    newValue = newValue.trim();
    if (!newValue) {
        showToast('Tag value cannot be empty', 'error');
        status.textContent = 'Error';
        return;
    }
    const musicFiles = getMusicFilesInCurrentDirectory();
    if (musicFiles.length === 0) {
        showToast('No music files in current folder', 'error');
        status.textContent = 'Error';
        return;
    }
    const payload = {
        path: musicFiles,
        tagType,
        replaceWith: newValue,
    };
    try {
        await jsonPost(`${APIBASE}/api/edittag`, payload);
        showToast(`Tag saved for ${musicFiles.length} file(s)`, 'success');
        if (currentTags && currentTags.path) {
            await loadTags(currentTags.path);
        }
        status.textContent = 'Saved';
    } catch (err) {
        console.error('Failed to save tag', err);
        showToast('Failed to save tag', 'error');
        status.textContent = 'Error';
    }
}

async function saveMultiTag(filePath, tagType, originalArray, index, newValue) {
    const status = document.getElementById('tag-status');
    status.textContent = 'Saving...';
    newValue = newValue.trim();
    if (!newValue) {
        showToast('Tag value cannot be empty', 'error');
        status.textContent = 'Error';
        return;
    }
    const oldValue = originalArray[index];
    const payload = {
        path: filePath,
        tagType,
        replaceWhat: oldValue,
        replaceWith: newValue,
    };
    try {
        await jsonPost(`${APIBASE}/api/edittag`, payload);
        showToast('Tag saved successfully', 'success');
        await loadTags(filePath);
        status.textContent = 'Saved';
    } catch (err) {
        console.error('Failed to save tag', err);
        showToast('Failed to save tag', 'error');
        status.textContent = 'Error';
    }
}

async function saveFolderMultiTag(tagType, originalArray, index, newValue) {
    const status = document.getElementById('tag-status');
    status.textContent = 'Saving to folder...';
    newValue = newValue.trim();
    if (!newValue) {
        showToast('Tag value cannot be empty', 'error');
        status.textContent = 'Error';
        return;
    }
    const musicFiles = getMusicFilesInCurrentDirectory();
    if (musicFiles.length === 0) {
        showToast('No music files in current folder', 'error');
        status.textContent = 'Error';
        return;
    }
    const oldValue = originalArray[index];
    const payload = {
        path: musicFiles,
        tagType,
        replaceWhat: oldValue,
        replaceWith: newValue,
    };
    try {
        await jsonPost(`${APIBASE}/api/edittag`, payload);
        showToast(`Tag saved for ${musicFiles.length} file(s)`, 'success');
        if (currentTags && currentTags.path) {
            await loadTags(currentTags.path);
        }
        status.textContent = 'Saved';
    } catch (err) {
        console.error('Failed to save tag', err);
        showToast('Failed to save tag', 'error');
        status.textContent = 'Error';
    }
}

async function showRemoveFieldActions(removeIcon, filePath, fieldType, fieldValue) {
    // Ask confirmation first
    const confirmed = await showModal(
        'Remove Field',
        `Are you sure you want to remove the field "${fieldType}"?`,
        '',
        true // isConfirmation
    );

    if (!confirmed) return;

    const labelWrapper = removeIcon.closest('.tag-label-wrapper');
    if (!labelWrapper) return;

    // Hide the red cross after confirmation
    removeIcon.style.display = 'none';

    // Remove any existing button group (avoid duplicates)
    const existingGroup = labelWrapper.querySelector('.tag-remove-button-group');
    if (existingGroup) existingGroup.remove();

    // Create button group for File/Folder choice
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'tag-remove-button-group';
    buttonGroup.style.display = 'inline-flex';
    buttonGroup.style.gap = '8px';
    buttonGroup.style.marginLeft = '12px';

    const restoreCrossAndClose = () => {
        // Requirement: after clicking ANY choice button, the cross comes back
        removeIcon.style.display = '';
        buttonGroup.remove();
    };

    const btnFile = document.createElement('button');
    btnFile.className = 'btn btn-sm btn-primary';
    btnFile.textContent = 'File';
    btnFile.addEventListener('click', () => {
        restoreCrossAndClose();
        removeFieldFromFile(filePath, fieldType, fieldValue, null);
    });

    const btnFolder = document.createElement('button');
    btnFolder.className = 'btn btn-sm btn-success';
    btnFolder.textContent = 'Folder';
    btnFolder.addEventListener('click', () => {
        restoreCrossAndClose();
        removeFieldFromFolder(fieldType, fieldValue, null);
    });

    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn btn-sm btn-secondary';
    btnCancel.textContent = 'Cancel';
    btnCancel.addEventListener('click', () => {
        restoreCrossAndClose();
    });

    buttonGroup.appendChild(btnFile);
    buttonGroup.appendChild(btnFolder);
    buttonGroup.appendChild(btnCancel);

    labelWrapper.appendChild(buttonGroup);
}

async function removeFieldFromFile(filePath, fieldType, fieldValue, buttonGroup) {
    const status = document.getElementById('tag-status');
    status.textContent = 'Removing field...';

    const payload = {
        path: filePath,
        fieldType: fieldType,
        value: fieldValue
    };

    try {
        await jsonPost(`${APIBASE}/api/removefieldtag`, payload);
        showToast('Field removed successfully', 'success');
        await loadTags(filePath);
        status.textContent = 'Field removed';
        if (buttonGroup) buttonGroup.remove();
    } catch (err) {
        console.error('Failed to remove field', err);
        showToast('Failed to remove field', 'error');
        status.textContent = 'Error';
        if (buttonGroup) buttonGroup.remove();
    }
}

async function removeFieldFromFolder(fieldType, fieldValue, buttonGroup) {
    const status = document.getElementById('tag-status');
    const musicFiles = getMusicFilesInCurrentDirectory();

    if (musicFiles.length === 0) {
        showToast('No music files in current folder', 'error');
        status.textContent = 'Error';
        return;
    }

    status.textContent = 'Removing field from folder...';

    const payload = {
        path: musicFiles,
        fieldType: fieldType,
        value: fieldValue
    };

    try {
        await jsonPost(`${APIBASE}/api/removefieldtag`, payload);
        showToast(`Field removed from ${musicFiles.length} files`, 'success');
        if (currentTags && currentTags.path) {
            await loadTags(currentTags.path);
        }
        status.textContent = 'Field removed';
        if (buttonGroup) buttonGroup.remove();
    } catch (err) {
        console.error('Failed to remove field', err);
        showToast('Failed to remove field', 'error');
        status.textContent = 'Error';
        if (buttonGroup) buttonGroup.remove();
    }
}


async function showAddFieldActions(btnAdd, filePath, fieldTypeInput, valueInput) {
    // Hide the Add button
    btnAdd.style.display = 'none';

    // Get the actions container
    const actionsContainer = btnAdd.closest('.tag-actions');

    // Create new button group
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'tag-add-button-group';

    const btnFile = document.createElement('button');
    btnFile.className = 'btn btn-sm btn-primary';
    btnFile.textContent = 'File';
    btnFile.addEventListener('click', () => addFieldToFile(filePath, fieldTypeInput, valueInput, btnAdd, buttonGroup));

    const btnFolder = document.createElement('button');
    btnFolder.className = 'btn btn-sm btn-success';
    btnFolder.textContent = 'Folder';
    btnFolder.addEventListener('click', () => addFieldToFolder(fieldTypeInput, valueInput, btnAdd, buttonGroup));

    // NO CANCEL BUTTON - already exists in UI as btnCancelAdd

    buttonGroup.appendChild(btnFile);
    buttonGroup.appendChild(btnFolder);

    // Insert before the Cancel button (btnCancelAdd)
    const btnCancelAdd = actionsContainer.querySelector('.btn-secondary');
    actionsContainer.insertBefore(buttonGroup, btnCancelAdd);
}

async function addFieldToFile(filePath, fieldTypeInput, valueInput, btnAdd, buttonGroup) {
    const status = document.getElementById('tag-status');
    const fieldType = fieldTypeInput.value.trim();
    let value = valueInput.value.trim();

    if (!fieldType) {
        showToast('Field type is required', 'error');
        return;
    }

    if (!value) {
        value = 'none';
    }

    status.textContent = 'Adding field...';

    const payload = {
        path: filePath,
        fieldType: fieldType,
        value: value,
    };

    try {
        await jsonPost(`${APIBASE}/api/addfieldtag`, payload);
        showToast('Field added successfully', 'success');
        fieldTypeInput.value = '';
        valueInput.value = '';
        await loadTags(filePath);
        status.textContent = 'Field added';

        // Clean up
        if (buttonGroup) buttonGroup.remove();
        btnAdd.style.display = '';
    } catch (err) {
        console.error('Failed to add field', err);
        showToast('Failed to add field', 'error');
        status.textContent = 'Error';

        // Clean up
        if (buttonGroup) buttonGroup.remove();
        btnAdd.style.display = '';
    }
}

async function addFieldToFolder(fieldTypeInput, valueInput, btnAdd, buttonGroup) {
    const status = document.getElementById('tag-status');
    const fieldType = fieldTypeInput.value.trim();
    let value = valueInput.value.trim();

    if (!fieldType) {
        showToast('Field type is required', 'error');
        return;
    }

    if (!value) {
        value = 'none';
    }

    const musicFiles = getMusicFilesInCurrentDirectory();
    if (musicFiles.length === 0) {
        showToast('No music files in current folder', 'error');
        status.textContent = 'Error';
        return;
    }

    status.textContent = 'Adding field to folder...';

    const payload = {
        path: musicFiles,
        fieldType: fieldType,
        value: value,
    };

    try {
        await jsonPost(`${APIBASE}/api/addfieldtag`, payload);
        showToast(`Field added to ${musicFiles.length} files`, 'success');
        fieldTypeInput.value = '';
        valueInput.value = '';
        if (currentTags && currentTags.path) {
            await loadTags(currentTags.path);
        }
        status.textContent = 'Field added';

        // Clean up
        if (buttonGroup) buttonGroup.remove();
        btnAdd.style.display = '';
    } catch (err) {
        console.error('Failed to add field', err);
        showToast('Failed to add field', 'error');
        status.textContent = 'Error';

        // Clean up
        if (buttonGroup) buttonGroup.remove();
        btnAdd.style.display = '';
    }
}


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

// Drag & Drop
const dropOverlay = document.getElementById('drop-overlay');

function showDropOverlay() {
    dropOverlay.classList.add('visible');
}

function hideDropOverlay() {
    dropOverlay.classList.remove('visible');
}

async function uploadFile(file, targetPath) {
    const formData = new FormData();
    formData.append('path', targetPath);
    formData.append('file', file);
    console.log('Uploading file:', file.name, 'to path:', targetPath);

    const res = await fetch(`${APIBASE}/api/store`, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Upload failed: ${res.status} ${text}`);
    }

    console.log('Upload successful:', file.name);
    uploadState.uploadedFiles++;
    updateUploadProgress();
}

async function handleDirectoryEntries(entries, basePath) {
    uploadState.totalFiles = 1;
    uploadState.uploadedFiles = 0;
    showUploadProgress();
    updateUploadProgress();

    let fileCount = 0;

    async function traverse(entry, path) {
        if (entry.isFile) {
            return new Promise((resolve, reject) => {
                entry.file(async (file) => {
                    try {
                        fileCount++;
                        uploadState.totalFiles = fileCount;
                        updateUploadProgress();
                        await uploadFile(file, path);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                }, reject);
            });
        }

        if (entry.isDirectory) {
            const newPath = `${path}/${entry.name}`;
            await jsonPost(`${APIBASE}/api/mkdir`, { path, name: entry.name }).catch(() => {});
            const reader = entry.createReader();
            return new Promise((resolve, reject) => {
                const read = () => {
                    reader.readEntries(async (list) => {
                        if (!list.length) return resolve();
                        try {
                            for (const e of list) {
                                await traverse(e, newPath);
                            }
                            read();
                        } catch (err) {
                            reject(err);
                        }
                    }, reject);
                };
                read();
            });
        }
    }

    try {
        for (const entry of entries) {
            await traverse(entry, basePath);
        }
        showToast('Upload completed successfully', 'success');
    } catch (err) {
        console.error('Upload error', err);
        showToast('Upload failed: ' + err.message, 'error');
    } finally {
        await loadDirectory(currentPath, false);
    }
}

async function handleDrop(event) {
    event.preventDefault();
    dragDepth = 0;
    hideDropOverlay();

    const targetPath = currentPath || mountPoint;
    if (!targetPath) {
        showToast('No target directory selected', 'error');
        return;
    }

    const items = event.dataTransfer.items;

    if (items && items.length > 0) {
        const entries = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind !== 'file') continue;
            const entry = item.webkitGetAsEntry?.();
            if (entry) entries.push(entry);
        }

        if (entries.length > 0) {
            await handleDirectoryEntries(entries, targetPath);
            return;
        }
    }

    const files = event.dataTransfer.files;
    if (!files || files.length === 0) {
        showToast('No files to upload', 'error');
        return;
    }

    try {
        const validFiles = Array.from(files).filter(f => f.size > 0 || f.type);
        uploadState.totalFiles = validFiles.length;
        uploadState.uploadedFiles = 0;
        showUploadProgress();
        updateUploadProgress();

        for (const file of validFiles) {
            await uploadFile(file, targetPath);
        }

        showToast('Upload completed successfully', 'success');
        await loadDirectory(currentPath, false);
    } catch (err) {
        console.error('Upload error', err);
        showToast('Upload failed: ' + err.message, 'error');
    }
}

document.addEventListener('dragenter', (e) => {
    if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        dragDepth++;
        showDropOverlay();
    }
});

document.addEventListener('dragover', (e) => {
    if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        e.preventDefault();
    }
});

document.addEventListener('dragleave', (e) => {
    dragDepth--;
    if (dragDepth === 0) {
        hideDropOverlay();
    }
});

document.addEventListener('drop', handleDrop);

// Navigation
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

// Initialize
pollMountPoint();

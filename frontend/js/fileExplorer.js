// File List Rendering
function getFileIconSVG(type) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");

    let path;
    switch (type) {
        case 'directory':
            // Folder icon
            path = document.createElementNS(svgNS, "path");
            path.setAttribute("d", "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z");
            path.setAttribute("fill", "currentColor");
            path.setAttribute("stroke", "none");
            svg.appendChild(path);
            break;
        case 'music':
            // Music disc icon
            const circle1 = document.createElementNS(svgNS, "circle");
            circle1.setAttribute("cx", "12");
            circle1.setAttribute("cy", "12");
            circle1.setAttribute("r", "10");
            circle1.setAttribute("fill", "currentColor");
            circle1.setAttribute("stroke", "none");
            svg.appendChild(circle1);

            const circle2 = document.createElementNS(svgNS, "circle");
            circle2.setAttribute("cx", "12");
            circle2.setAttribute("cy", "12");
            circle2.setAttribute("r", "3");
            circle2.setAttribute("fill", "rgba(0,0,0,0.3)");
            circle2.setAttribute("stroke", "none");
            svg.appendChild(circle2);
            break;
        case 'picture':
            // Image icon
            const rect = document.createElementNS(svgNS, "rect");
            rect.setAttribute("x", "3");
            rect.setAttribute("y", "3");
            rect.setAttribute("width", "18");
            rect.setAttribute("height", "18");
            rect.setAttribute("rx", "2");
            rect.setAttribute("ry", "2");
            rect.setAttribute("fill", "currentColor");
            rect.setAttribute("stroke", "none");
            svg.appendChild(rect);

            const circlePic = document.createElementNS(svgNS, "circle");
            circlePic.setAttribute("cx", "8.5");
            circlePic.setAttribute("cy", "8.5");
            circlePic.setAttribute("r", "1.5");
            circlePic.setAttribute("fill", "rgba(0,0,0,0.3)");
            circlePic.setAttribute("stroke", "none");
            svg.appendChild(circlePic);

            const polyline = document.createElementNS(svgNS, "polyline");
            polyline.setAttribute("points", "21,15 16,10 5,21");
            polyline.setAttribute("stroke", "rgba(0,0,0,0.3)");
            polyline.setAttribute("stroke-width", "2");
            polyline.setAttribute("fill", "none");
            svg.appendChild(polyline);
            break;
        default:
            // File icon
            path = document.createElementNS(svgNS, "path");
            path.setAttribute("d", "M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z");
            path.setAttribute("fill", "currentColor");
            path.setAttribute("stroke", "none");
            svg.appendChild(path);

            const polylineFile = document.createElementNS(svgNS, "polyline");
            polylineFile.setAttribute("points", "13 2 13 9 20 9");
            polylineFile.setAttribute("fill", "rgba(0,0,0,0.2)");
            polylineFile.setAttribute("stroke", "none");
            svg.appendChild(polylineFile);
            break;
    }

    return svg;
}

function getFileType(node) {
    if (node.type === 'directory') return 'Folder';
    if (node.type === 'music') return 'Audio File';
    if (node.type === 'picture') return 'Image';
    if (node.extension) return node.extension.toUpperCase() + ' File';
    return 'File';
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

// --- Directory state persistence (scroll + selection) ---
function saveDirectoryState() {
    if (!currentPath) return;
    const scrollContainer = document.getElementById('explorer-content');
    const state = {
        scrollTop: scrollContainer ? scrollContainer.scrollTop : 0,
        selectedPaths: selectedFiles.map(f => f.path)
    };
    try {
        sessionStorage.setItem('dirState:' + currentPath, JSON.stringify(state));
    } catch (e) { /* quota exceeded – ignore */ }
}

function restoreDirectoryState() {
    if (!currentPath) return;
    try {
        const raw = sessionStorage.getItem('dirState:' + currentPath);
        if (!raw) return;
        const state = JSON.parse(raw);

        // Restore selection
        if (state.selectedPaths && state.selectedPaths.length > 0) {
            const allRows = Array.from(document.querySelectorAll('#file-table-body tr'));
            const savedSet = new Set(state.selectedPaths);
            selectedFiles = [];
            lastSelectedIndex = -1;
            allRows.forEach((row, idx) => {
                if (savedSet.has(row.dataset.path)) {
                    _addSelectedRow(row);
                    selectedFiles.push({
                        path: row.dataset.path,
                        type: row.dataset.type,
                        extension: row.dataset.extension,
                        name: row.dataset.name ?? row.querySelector('.file-name')?.textContent
                    });
                    lastSelectedIndex = idx;
                }
            });
            if (selectedFiles.length > 0) {
                updateTagPanelForSelection();
            }
        }

        // Restore scroll position after a microtask so the DOM has settled
        if (state.scrollTop) {
            const scrollContainer = document.getElementById('explorer-content');
            if (scrollContainer) {
                requestAnimationFrame(() => {
                    scrollContainer.scrollTop = state.scrollTop;
                });
            }
        }
    } catch (e) { /* corrupted data – ignore */ }
}

async function loadDirectory(path, addToHistory = true) {
    try {
        // Save state of the directory we're leaving
        saveDirectoryState();

        // Cancel any pending debounced scroll-save so it doesn't fire for the new directory
        clearTimeout(_scrollSaveTimer);

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
        // Reset selection state before rendering
        selectedFiles = [];
        lastSelectedIndex = -1;

        renderFileList(tree);
        updateBreadcrumb(path);
        updateNavigationButtons();

        // Reset scroll to top immediately
        const scrollContainer = document.getElementById('explorer-content');
        if (scrollContainer) scrollContainer.scrollTop = 0;

        // Restore saved state for the new directory (overrides scroll if previously visited)
        restoreDirectoryState();

        // Also reset scroll in next frame to ensure it sticks after layout
        if (scrollContainer) {
            requestAnimationFrame(() => {
                const saved = sessionStorage.getItem('dirState:' + currentPath);
                if (!saved) {
                    scrollContainer.scrollTop = 0;
                }
            });
        }
    } catch (err) {
        console.error('Failed to load directory', err);
        showToast(`Failed to load directory: ${err.message}`, 'error');
    }
}

// Tracks currently-selected TR elements so we can clear them in O(selection) not O(n).
const _selectedRows = new Set();

function _clearSelectedRows() {
    _selectedRows.forEach(r => r.classList.remove('selected'));
    _selectedRows.clear();
}

function _addSelectedRow(tr) {
    tr.classList.add('selected');
    _selectedRows.add(tr);
}

function _removeSelectedRow(tr) {
    tr.classList.remove('selected');
    _selectedRows.delete(tr);
}

function renderFileList(tree) {
    const tbody = document.getElementById('file-table-body');
    _clearSelectedRows();
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
    const nodes = sortNodes(tree.content);
    // Build all rows in a DocumentFragment to minimize reflows
    const fragment = document.createDocumentFragment();
    nodes.forEach(node => {
        const tr = document.createElement('tr');
        const fullPath = node.name.startsWith('/') ? node.name : `${currentPath}/${node.name}`;
        tr.dataset.path = fullPath;
        tr.dataset.type = node.type;
        // Store the display name so delegated handler can read it without querySelector
        tr.dataset.name = node.name.split('/').pop();
        if (node.extension) tr.dataset.extension = node.extension;

        const tdName = document.createElement('td');
        const nameCell = document.createElement('div');
        nameCell.className = 'file-name-cell';
        const icon = document.createElement('div');
        icon.className = `file-icon ${node.type}`;
        icon.appendChild(getFileIconSVG(node.type));
        const name = document.createElement('span');
        name.className = 'file-name';
        name.textContent = tr.dataset.name;
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
        fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);
    _attachTableDelegation(tbody);
}

// Single delegated handler — attached once after each renderFileList call.
let _delegationAttached = false;
function _attachTableDelegation(tbody) {
    if (_delegationAttached) return;
    _delegationAttached = true;
    tbody.addEventListener('click', _onTableClick);
    tbody.addEventListener('dblclick', _onTableDblClick);
    tbody.addEventListener('contextmenu', _onTableContextMenu);
}

function _rowOf(target) {
    return target.closest('#file-table-body tr');
}

function _onTableClick(e) {
    const tr = _rowOf(e.target);
    if (!tr) return;
    handleFileClick(tr, e);
}

function _onTableDblClick(e) {
    const tr = _rowOf(e.target);
    if (!tr) return;
    if (tr.dataset.type === 'directory') loadDirectory(tr.dataset.path);
}

function _onTableContextMenu(e) {
    const tr = _rowOf(e.target);
    if (!tr) return;
    e.preventDefault();
    openContextMenu(e.clientX, e.clientY, tr);
}

function _rowToFileData(row) {
    return { path: row.dataset.path, type: row.dataset.type, extension: row.dataset.extension, name: row.dataset.name };
}

function handleFileClick(tr, event) {
    const allRows = Array.from(document.querySelectorAll('#file-table-body tr'));
    const clickedIndex = allRows.indexOf(tr);

    if (event.ctrlKey || event.metaKey) {
        // Ctrl+Click: Toggle selection
        if (tr.classList.contains('selected')) {
            _removeSelectedRow(tr);
            selectedFiles = selectedFiles.filter(f => f.path !== tr.dataset.path);
        } else {
            _addSelectedRow(tr);
            selectedFiles.push(_rowToFileData(tr));
        }
        lastSelectedIndex = clickedIndex;
    } else if (event.shiftKey && lastSelectedIndex !== -1) {
        // Shift+Click: Range selection
        const start = Math.min(lastSelectedIndex, clickedIndex);
        const end = Math.max(lastSelectedIndex, clickedIndex);

        // Clear previous selection unless Ctrl is also held
        if (!event.ctrlKey && !event.metaKey) {
            _clearSelectedRows();
            selectedFiles = [];
        }

        // Select range
        for (let i = start; i <= end; i++) {
            const row = allRows[i];
            if (!row.classList.contains('selected')) {
                _addSelectedRow(row);
                selectedFiles.push(_rowToFileData(row));
            }
        }
    } else {
        // Regular click: Select only this item
        _clearSelectedRows();
        _addSelectedRow(tr);
        selectedFiles = [_rowToFileData(tr)];
        lastSelectedIndex = clickedIndex;
    }

    // Update tag panel based on selection
    updateTagPanelForSelection();

    // Persist selection state
    saveDirectoryState();
}

function updateTagPanelForSelection() {
    if (selectedFiles.length === 0) {
        clearTags();
    } else if (selectedFiles.length === 1) {
        const file = selectedFiles[0];
        if (file.type === 'music') {
            loadTags(file.path);
        } else {
            clearTags();
        }
    } else {
        // Multiple files selected
        showMultipleFilesSelected();
    }
}

async function showMultipleFilesSelected() {
    const panel = document.getElementById('panel-content');
    const status = document.getElementById('tag-status');

    // Filter only music files
    const musicFiles = selectedFiles.filter(f => f.type === 'music');

    if (musicFiles.length === 0) {
        status.textContent = `${selectedFiles.length} files selected (no music files)`;
        panel.innerHTML = `
            <div class="empty-state">
                <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <path d="M9 15h6"></path>
                    <path d="M12 12v6"></path>
                </svg>
                <p>${selectedFiles.length} files selected</p>
                <p style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">No music files selected</p>
            </div>`;
        return;
    }

    status.textContent = `Loading tags for ${musicFiles.length} files...`;
    panel.innerHTML = `
        <div class="empty-state">
            <p>Loading tags...</p>
        </div>`;

    try {
        // Fetch tags for all music files in parallel
        const tagPromises = musicFiles.map(file =>
            fetch(`${APIBASE}/api/tag?path=${encodeURIComponent(file.path)}`)
                .then(res => res.ok ? res.json() : {})
                .catch(() => ({}))
        );

        const allTags = await Promise.all(tagPromises);

        // Merge tags
        const mergedTags = mergeMultiFileTags(allTags);

        // Render merged tags
        renderMergedTags(mergedTags, musicFiles.map(f => f.path));

        status.textContent = `${musicFiles.length} music files selected`;
    } catch (err) {
        console.error('Failed to load multi-file tags', err);
        status.textContent = 'Error loading tags';
        panel.innerHTML = `
            <div class="empty-state">
                <p style="color: var(--danger);">Failed to load tags</p>
            </div>`;
    }
}

function mergeMultiFileTags(allTags) {
    if (allTags.length === 0) return {};
    if (allTags.length === 1) return allTags[0];

    // Get all unique tag keys across all files
    const allKeys = new Set();
    allTags.forEach(tags => {
        Object.keys(tags).forEach(key => allKeys.add(key));
    });

    const merged = {};

    allKeys.forEach(key => {
        // Collect all values for this key
        const values = allTags.map(tags => tags[key]);

        // Check if all values are the same
        const uniqueValues = [...new Set(values.map(v => JSON.stringify(v)))];

        if (uniqueValues.length === 1) {
            // All same - use the value directly
            merged[key] = values[0];
        } else {
            // Different values - store all unique values
            merged[key] = {
                __multiValue: true,
                values: values.filter(v => v !== undefined && v !== null)
            };
        }
    });

    return merged;
}

function renderMergedTags(mergedTags, filePaths) {
    const panel = document.getElementById('panel-content');
    panel.innerHTML = '';

    const entries = Object.entries(mergedTags);

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
            if (value && value.__multiValue) {
                // Multi-value field - render with <keep> dropdown
                renderMultiValueTag(tagGroup, key, value.values, filePaths);
            } else if (Array.isArray(value)) {
                // Array value (same across all files)
                value.forEach((item, index) => {
                    renderSingleValueTag(tagGroup, key, item, filePaths, true, index);
                });
            } else {
                // Single value (same across all files)
                renderSingleValueTag(tagGroup, key, value, filePaths, false);
            }
        });
    }

    panel.appendChild(tagGroup);
}

function renderMultiValueTag(container, tagKey, allValues, filePaths) {
    const row = document.createElement('div');
    row.className = 'tag-row';

    const label = document.createElement('label');
    label.className = 'tag-label';
    label.textContent = tagKey;

    // Create input with custom dropdown for suggestions
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'custom-dropdown-wrapper';
    inputWrapper.style.position = 'relative';
    inputWrapper.style.flex = '1';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tag-input';
    input.dataset.key = tagKey;
    input.placeholder = '<keep>';
    input.value = ''; // Start empty to indicate <keep>

    // Create custom dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'custom-dropdown';
    dropdown.style.display = 'none';

    // Get all unique values for this tag
    const uniqueValues = new Set();
    allValues.forEach(val => {
        if (Array.isArray(val)) {
            val.forEach(v => uniqueValues.add(String(v ?? '')));
        } else {
            uniqueValues.add(String(val ?? ''));
        }
    });

    // Populate dropdown options
    const sortedValues = Array.from(uniqueValues).sort();
    sortedValues.forEach(value => {
        if (value) { // Only add non-empty values to dropdown
            const option = document.createElement('div');
            option.className = 'dropdown-option';
            option.textContent = value;
            option.addEventListener('click', () => {
                input.value = value;
                dropdown.style.display = 'none';
                // Trigger input event to show save actions
                input.dispatchEvent(new Event('input'));
            });
            dropdown.appendChild(option);
        }
    });

    // Show/hide dropdown on focus/blur
    input.addEventListener('focus', () => {
        if (dropdown.children.length > 0) {
            dropdown.style.display = 'block';
            // Reset filter on focus
            Array.from(dropdown.children).forEach(option => {
                option.style.display = 'block';
            });
        }
    });

    input.addEventListener('blur', (e) => {
        // Delay to allow click on dropdown option
        setTimeout(() => {
            dropdown.style.display = 'none';
        }, 200);
    });

    // Filter dropdown based on input
    input.addEventListener('input', () => {
        const filterText = input.value.toLowerCase();
        let hasVisibleOptions = false;

        Array.from(dropdown.children).forEach(option => {
            if (option.textContent.toLowerCase().includes(filterText)) {
                option.style.display = 'block';
                hasVisibleOptions = true;
            } else {
                option.style.display = 'none';
            }
        });

        dropdown.style.display = hasVisibleOptions ? 'block' : 'none';
    });

    inputWrapper.appendChild(input);
    inputWrapper.appendChild(dropdown);
    row.appendChild(label);
    row.appendChild(inputWrapper);

    const actions = document.createElement('div');
    actions.className = 'tag-actions';

    const btnSave = document.createElement('button');
    btnSave.className = 'btn btn-success';
    btnSave.textContent = 'Save All';
    btnSave.addEventListener('click', () => {
        const value = input.value.trim();
        if (!value) {
            showToast('Please enter a value', 'error');
            return;
        }
        saveMultiFileTag(filePaths, tagKey, value);
    });

    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn btn-secondary';
    btnCancel.textContent = 'Cancel';
    btnCancel.addEventListener('click', () => {
        input.value = '';
        actions.classList.remove('visible');
    });

    actions.appendChild(btnSave);
    actions.appendChild(btnCancel);

    input.addEventListener('input', () => {
        if (input.value.trim()) {
            actions.classList.add('visible');
        } else {
            actions.classList.remove('visible');
        }
    });

    row.appendChild(actions);
    container.appendChild(row);
}

function renderSingleValueTag(container, tagKey, value, filePaths, isArray, arrayIndex) {
    const row = document.createElement('div');
    row.className = 'tag-row';

    const label = document.createElement('label');
    label.className = 'tag-label';
    label.textContent = tagKey;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tag-input';
    input.value = String(value ?? '');
    input.dataset.key = tagKey;
    if (isArray) {
        input.dataset.isArray = 'true';
        input.dataset.arrayIndex = arrayIndex;
    }

    const actions = document.createElement('div');
    actions.className = 'tag-actions';

    const btnSave = document.createElement('button');
    btnSave.className = 'btn btn-success';
    btnSave.textContent = 'Save All';
    btnSave.addEventListener('click', () => saveMultiFileTag(filePaths, tagKey, input.value));

    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn btn-secondary';
    btnCancel.textContent = 'Cancel';
    btnCancel.addEventListener('click', () => {
        input.value = String(value ?? '');
        actions.classList.remove('visible');
    });

    actions.appendChild(btnSave);
    actions.appendChild(btnCancel);

    input.addEventListener('input', () => {
        if (input.value !== String(value ?? '')) {
            actions.classList.add('visible');
        } else {
            actions.classList.remove('visible');
        }
    });

    row.appendChild(label);
    row.appendChild(input);
    row.appendChild(actions);
    container.appendChild(row);
}

async function saveMultiFileTag(filePaths, tagType, newValue) {
    const status = document.getElementById('tag-status');

    if (newValue === '__KEEP__') {
        showToast('Please select or enter a value', 'error');
        return;
    }

    newValue = newValue.trim();
    if (!newValue) {
        showToast('Tag value cannot be empty', 'error');
        return;
    }

    status.textContent = `Saving to ${filePaths.length} files...`;

    // Send individual requests for each file
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < filePaths.length; i++) {
        const filePath = filePaths[i];
        const payload = {
            path: filePath,
            tagType,
            replaceWith: newValue,
        };

        try {
            status.textContent = `Saving ${i + 1}/${filePaths.length}...`;
            await jsonPost(`${APIBASE}/api/edittag`, payload);
            successCount++;
        } catch (err) {
            errorCount++;
            const fileName = filePath.split('/').pop();
            errors.push(`${fileName}: ${err.message}`);
            console.error(`Failed to save tag for ${filePath}`, err);
        }
    }

    // Show results
    if (errorCount === 0) {
        showToast(`Tag saved for ${successCount} file(s)`, 'success');
    } else if (successCount === 0) {
        showToast(`Failed to save tag for all ${errorCount} file(s)`, 'error');
        // Show first few errors
        if (errors.length > 0) {
            const errorMsg = errors.slice(0, 3).join('\n');
            console.error('Save errors:', errorMsg);
        }
    } else {
        showToast(`Saved ${successCount}, failed ${errorCount} file(s)`, 'error');
        if (errors.length > 0) {
            const errorMsg = errors.slice(0, 3).join('\n');
            console.error('Save errors:', errorMsg);
        }
    }

    // Reload tags for all selected files
    status.textContent = `Reloading tags...`;
    await showMultipleFilesSelected();
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

// Save scroll position on scroll (debounced)
let _scrollSaveTimer = null;
document.getElementById('explorer-content').addEventListener('scroll', () => {
    clearTimeout(_scrollSaveTimer);
    _scrollSaveTimer = setTimeout(() => saveDirectoryState(), 150);
});

// Click on empty area to deselect all
document.getElementById('file-table-body').addEventListener('click', (e) => {
    // Only deselect if clicking directly on tbody (empty area)
    if (e.target.tagName === 'TBODY') {
        _clearSelectedRows();
        selectedFiles = [];
        lastSelectedIndex = -1;
        clearTags();
        saveDirectoryState();
    }
});

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
        const tags = await jsonGet(`${APIBASE}/api/tag?path=${encodeURIComponent(filePath)}`);
        currentTags = { path: filePath, tags };
        renderTags(tags, filePath);
        status.textContent = filePath.split('/').pop();
    } catch (err) {
        console.error('Failed to load tags', err);
        showToast(`Failed to load tags: ${err.message}`, 'error');
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
                btnSaveFolder.addEventListener('click', () => saveFolderSingleTag(key, String(value ?? ''), input.value));

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

    const historyBtn = document.createElement('button');
    historyBtn.className = 'btn-history-panel';
    historyBtn.title = 'View change history';
    historyBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path>
            <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        History`;
    historyBtn.addEventListener('click', () => openHistoryPanel(filePath));
    panel.appendChild(historyBtn);

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
    fieldTypeInput.setAttribute('autocomplete', 'off');

    const autocompleteContainer = document.createElement('div');
    autocompleteContainer.className = 'autocomplete-container';

    const autocompleteList = document.createElement('div');
    autocompleteList.className = 'autocomplete-list';

    const showHints = (query) => {
        autocompleteList.innerHTML = '';
        if (!query) { autocompleteList.classList.remove('visible'); return; }
        const filtered = tagRegistryHints.filter(h => h.toLowerCase().includes(query.toLowerCase()));
        if (filtered.length === 0) { autocompleteList.classList.remove('visible'); return; }
        filtered.forEach(hint => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.textContent = hint;
            item.addEventListener('mousedown', (e) => { e.preventDefault(); fieldTypeInput.value = hint; autocompleteList.classList.remove('visible'); });
            autocompleteList.appendChild(item);
        });
        autocompleteList.classList.add('visible');
    };

    fieldTypeInput.addEventListener('input', () => showHints(fieldTypeInput.value.trim()));
    fieldTypeInput.addEventListener('focus', () => { if (fieldTypeInput.value.trim()) showHints(fieldTypeInput.value.trim()); });
    fieldTypeInput.addEventListener('blur', () => autocompleteList.classList.remove('visible'));
    fieldTypeInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') autocompleteList.classList.remove('visible'); });

    autocompleteContainer.appendChild(fieldTypeInput);
    autocompleteContainer.appendChild(autocompleteList);

    fieldTypeRow.appendChild(fieldTypeLabel);
    fieldTypeRow.appendChild(autocompleteContainer);
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
        replaceWhat: String(originalValue ?? ''),
        replaceWith: newValue,
    };
    try {
        await jsonPost(`${APIBASE}/api/edittag`, payload);
        showToast('Tag saved successfully', 'success');
        await loadTags(filePath);
        status.textContent = 'Saved';
    } catch (err) {
        console.error('Failed to save tag', err);
        showToast(`Failed to save tag: ${err.message}`, 'error');
        status.textContent = 'Error';
    }
}

async function saveFolderSingleTag(tagType, oldValue, newValue) {
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
    const errors = [];
    for (let i = 0; i < musicFiles.length; i++) {
        status.textContent = `Saving to folder... (${i + 1}/${musicFiles.length})`;
        const payload = {
            path: musicFiles[i],
            tagType,
            replaceWhat: oldValue,
            replaceWith: newValue,
        };

        try {
            await jsonPost(`${APIBASE}/api/edittag`, payload);
        } catch (err) {
            console.error(`Failed to save tag for ${musicFiles[i]}`, err);
            errors.push(musicFiles[i]);
        }
    }
    if (errors.length > 0) {
        showToast(`Tag saved with ${errors.length} error(s) out of ${musicFiles.length} file(s)`, 'error');
        status.textContent = 'Partial error';
    } else {
        showToast(`Tag saved for ${musicFiles.length} file(s)`, 'success');
        status.textContent = 'Saved';
    }
    if (currentTags && currentTags.path) {
        await loadTags(currentTags.path);
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
        showToast(`Failed to save tag: ${err.message}`, 'error');
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
    const errors = [];
    for (let i = 0; i < musicFiles.length; i++) {
        status.textContent = `Saving to folder... (${i + 1}/${musicFiles.length})`;
        const payload = {
            path: musicFiles[i],
            tagType,
            replaceWhat: oldValue,
            replaceWith: newValue,
        };
        try {
            await jsonPost(`${APIBASE}/api/edittag`, payload);
        } catch (err) {
            console.error(`Failed to save tag for ${musicFiles[i]}`, err);
            errors.push(musicFiles[i]);
        }
    }
    if (errors.length > 0) {
        showToast(`Tag saved with ${errors.length} error(s) out of ${musicFiles.length} file(s)`, 'error');
        status.textContent = 'Partial error';
    } else {
        showToast(`Tag saved for ${musicFiles.length} file(s)`, 'success');
        status.textContent = 'Saved';
    }
    if (currentTags && currentTags.path) {
        await loadTags(currentTags.path);
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
        showToast(`Failed to remove field: ${err.message}`, 'error');
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

    const errors = [];
    for (let i = 0; i < musicFiles.length; i++) {
        status.textContent = `Removing field from folder... (${i + 1}/${musicFiles.length})`;
        const payload = {
            path: musicFiles[i],
            fieldType: fieldType,
            value: fieldValue
        };
        try {
            await jsonPost(`${APIBASE}/api/removefieldtag`, payload);
        } catch (err) {
            console.error(`Failed to remove field for ${musicFiles[i]}`, err);
            errors.push(musicFiles[i]);
        }
    }
    if (errors.length > 0) {
        showToast(`Field removed with ${errors.length} error(s) out of ${musicFiles.length} file(s)`, 'error');
        status.textContent = 'Partial error';
    } else {
        showToast(`Field removed from ${musicFiles.length} files`, 'success');
        status.textContent = 'Field removed';
    }
    if (currentTags && currentTags.path) {
        await loadTags(currentTags.path);
    }
    if (buttonGroup) buttonGroup.remove();
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
        showToast(`Failed to add field: ${err.message}`, 'error');
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

    const errors = [];
    for (let i = 0; i < musicFiles.length; i++) {
        status.textContent = `Adding field to folder... (${i + 1}/${musicFiles.length})`;
        const payload = {
            path: musicFiles[i],
            fieldType: fieldType,
            value: value,
        };
        try {
            await jsonPost(`${APIBASE}/api/addfieldtag`, payload);
        } catch (err) {
            console.error(`Failed to add field for ${musicFiles[i]}`, err);
            errors.push(musicFiles[i]);
        }
    }
    if (errors.length > 0) {
        showToast(`Field added with ${errors.length} error(s) out of ${musicFiles.length} file(s)`, 'error');
        status.textContent = 'Partial error';
    } else {
        showToast(`Field added to ${musicFiles.length} files`, 'success');
        status.textContent = 'Field added';
    }
    fieldTypeInput.value = '';
    valueInput.value = '';
    if (currentTags && currentTags.path) {
        await loadTags(currentTags.path);
    }

    // Clean up
    if (buttonGroup) buttonGroup.remove();
    btnAdd.style.display = '';
}

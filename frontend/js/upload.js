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
    hideUploadProgress();
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
    // Only increment after successful upload
    uploadState.uploadedFiles++;
    updateUploadProgress();
}

async function handleDirectoryEntries(entries, basePath) {
    // First pass: count total files
    let totalFileCount = 0;

    async function countFiles(entry) {
        if (entry.isFile) {
            totalFileCount++;
        } else if (entry.isDirectory) {
            const reader = entry.createReader();
            const subEntries = await new Promise((resolve, reject) => {
                reader.readEntries((results) => resolve(results), reject);
            });
            for (const subEntry of subEntries) {
                await countFiles(subEntry);
            }
        }
    }

    // Count all files first
    for (const entry of entries) {
        await countFiles(entry);
    }

    // Initialize upload state with actual total
    uploadState.totalFiles = totalFileCount;
    uploadState.uploadedFiles = 0;
    showUploadProgress();
    updateUploadProgress();

    async function traverse(entry, path) {
        if (entry.isFile) {
            return new Promise((resolve, reject) => {
                entry.file(async (file) => {
                    try {
                        console.log(`Processing file: ${file.name}, size: ${file.size} bytes, path: ${path}`);
                        await uploadFile(file, path);
                        resolve();
                    } catch (e) {
                        console.error(`Failed to upload file ${file.name}:`, e);
                        reject(e);
                    }
                }, (err) => {
                    console.error(`Failed to read file entry ${entry.name}:`, err);
                    reject(err);
                });
            });
        }

        if (entry.isDirectory) {
            const newPath = `${path}/${entry.name}`;
            await jsonPost(`${APIBASE}/api/mkdir`, { path, name: entry.name }).catch(() => { });
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
        const errors = [];
        for (const entry of entries) {
            try {
                await traverse(entry, basePath);
            } catch (err) {
                console.error(`Failed to process entry ${entry.name}:`, err);
                errors.push({ name: entry.name, error: err.message });
                // Continue with other files instead of stopping
            }
        }

        if (errors.length > 0) {
            console.warn(`Upload completed with ${errors.length} error(s):`, errors);
            showToast(`Upload completed (${errors.length} file(s) skipped due to errors)`, 'warning');
        } else {
            showToast('Upload completed successfully', 'success');
        }
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

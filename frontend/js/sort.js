// Sorting state
let sortColumn = 'default'; // 'default' | 'name' | 'type'
let sortDirection = 'asc';  // 'asc' | 'desc'

// Type priority for default sort (lower = higher priority)
const TYPE_PRIORITY = { directory: 0, music: 1, picture: 2 };
const getTypePriority = (node) => TYPE_PRIORITY[node.type] ?? 3;

// Type label priority for type-column sort (matches getFileType output groups)
const TYPE_LABEL_PRIORITY = { 'Folder': 0, 'Audio File': 1, 'Image': 2 };
const getTypeLabelPriority = (label) => TYPE_LABEL_PRIORITY[label] ?? 3;

// Natural string comparator (handles embedded numbers like "Track 2" < "Track 10")
const naturalCompare = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

function sortNodes(nodes) {
    const sorted = [...nodes];
    if (sortColumn === 'default') {
        sorted.sort((a, b) => {
            const typeDiff = getTypePriority(a) - getTypePriority(b);
            return typeDiff !== 0 ? typeDiff : naturalCompare(a.name.split('/').pop(), b.name.split('/').pop());
        });
        return sorted;
    }
    if (sortColumn === 'name') {
        sorted.sort((a, b) => {
            const isADir = a.type === 'directory' ? 0 : 1;
            const isBDir = b.type === 'directory' ? 0 : 1;
            const dirDiff = isADir - isBDir;
            if (dirDiff !== 0) return dirDiff;
            const cmp = naturalCompare(a.name.split('/').pop(), b.name.split('/').pop());
            return sortDirection === 'asc' ? cmp : -cmp;
        });
        return sorted;
    }
    if (sortColumn === 'type') {
        sorted.sort((a, b) => {
            const isADir = a.type === 'directory' ? 0 : 1;
            const isBDir = b.type === 'directory' ? 0 : 1;
            const dirDiff = isADir - isBDir;
            if (dirDiff !== 0) return dirDiff;
            const labelA = getFileType(a);
            const labelB = getFileType(b);
            const priDiff = (getTypeLabelPriority(labelA) - getTypeLabelPriority(labelB));
            if (priDiff !== 0) return sortDirection === 'asc' ? priDiff : -priDiff;
            const cmp = naturalCompare(labelA, labelB);
            const cmpResult = sortDirection === 'asc' ? cmp : -cmp;
            return cmpResult !== 0 ? cmpResult : naturalCompare(a.name.split('/').pop(), b.name.split('/').pop());
        });
        return sorted;
    }
    return sorted;
}

function updateSortHeaders() {
    const thName = document.querySelector('th.col-name');
    const thType = document.querySelector('th.col-type');
    [thName, thType].forEach(th => {
        if (!th) return;
        th.classList.remove('sort-asc', 'sort-desc', 'sort-active');
    });
    const activeCol = sortColumn === 'name' ? thName : sortColumn === 'type' ? thType : null;
    if (activeCol) {
        activeCol.classList.add('sort-active', sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
    }
}

function initSortHeaders() {
    const thName = document.querySelector('th.col-name');
    const thType = document.querySelector('th.col-type');
    if (thName) thName.style.cursor = 'pointer';
    if (thType) thType.style.cursor = 'pointer';

    thName?.addEventListener('click', () => {
        if (sortColumn === 'name') {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortColumn = 'name';
            sortDirection = 'desc';
        }
        updateSortHeaders();
        if (fileTreeData) renderFileList(fileTreeData);
    });

    thType?.addEventListener('click', () => {
        if (sortColumn === 'type') {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortColumn = 'type';
            sortDirection = 'desc';
        }
        updateSortHeaders();
        if (fileTreeData) renderFileList(fileTreeData);
    });

    updateSortHeaders();
}

document.addEventListener('DOMContentLoaded', initSortHeaders);

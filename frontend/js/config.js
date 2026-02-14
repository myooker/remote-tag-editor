// Config
const APIBASE = window.location.origin;
//const APIBASE = "http://localhost:18080";
const POLL_INTERVAL_MS = 5000;

// State
let mountPoint = null;
let currentPath = null;
let navigationHistory = [];
let historyIndex = -1;
let fileTreeData = null;
let selectedFiles = []; // Changed from selectedFile to support multi-selection
let lastSelectedIndex = -1; // For Shift+Click range selection
let currentTags = null;
let dragDepth = 0;

// Upload Progress State
let uploadState = {
    totalFiles: 0,
    uploadedFiles: 0,
    isUploading: false
};

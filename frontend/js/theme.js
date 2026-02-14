// Theme Management
function getTheme() {
    return localStorage.getItem('theme') || 'modern-dark';
}

function setTheme(themeName) {
    // Remove all theme classes
    document.body.classList.remove('theme-modern-dark', 'theme-windows-95');

    // Add new theme class
    if (themeName !== 'modern-dark') {
        document.body.classList.add(`theme-${themeName}`);
    }

    // Save to localStorage
    localStorage.setItem('theme', themeName);
}

// Initialize theme on page load
setTheme(getTheme());

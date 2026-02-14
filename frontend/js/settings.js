// Settings Modal
const settingsBtn = document.getElementById('settings-btn');
const settingsOverlay = document.getElementById('settings-overlay');
const settingsDialog = document.getElementById('settings-dialog');
const settingsClose = document.getElementById('settings-close');
const settingsCancel = document.getElementById('settings-cancel');
const settingsApply = document.getElementById('settings-apply');

function openSettings() {
    settingsOverlay.classList.add('visible');
    // Set current theme in radio buttons
    const currentTheme = getTheme();
    document.querySelector(`input[name="theme"][value="${currentTheme}"]`).checked = true;
}

function closeSettings() {
    settingsOverlay.classList.remove('visible');
}

settingsBtn.addEventListener('click', openSettings);
settingsClose.addEventListener('click', closeSettings);
settingsCancel.addEventListener('click', closeSettings);

settingsApply.addEventListener('click', () => {
    const selectedTheme = document.querySelector('input[name="theme"]:checked').value;
    setTheme(selectedTheme);
    closeSettings();
    showToast('Theme applied successfully', 'success');
});

settingsOverlay.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) {
        closeSettings();
    }
});

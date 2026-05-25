// Settings Modal
const settingsBtn = document.getElementById('settings-btn');
const settingsOverlay = document.getElementById('settings-overlay');
const settingsDialog = document.getElementById('settings-dialog');
const settingsClose = document.getElementById('settings-close');
const settingsCancel = document.getElementById('settings-cancel');
const settingsApply = document.getElementById('settings-apply');

async function openSettings() {
    settingsOverlay.classList.add('visible');
    const currentTheme = getTheme();
    const radio = document.querySelector(`input[name="theme"][value="${currentTheme}"]`);
    if (radio) radio.checked = true;

    const versionEl = document.getElementById('info-version');
    const mountEl = document.getElementById('info-mountpoint');
    const rteidEl = document.getElementById('info-rteid');

    if (!versionEl || !mountEl || !rteidEl) {
        console.error('settings: info elements not found in DOM');
        return;
    }

    try {
        const res = await fetch(`${APIBASE}/api/settings`);
        const s = await res.json();
        versionEl.textContent = s.version ?? '—';
        mountEl.textContent = s.mountpoint || '—';
        rteidEl.textContent = s.rteid ? 'Enabled' : 'Disabled';
    } catch (e) {
        console.error('settings: fetch failed', e);
    }
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

// Modal Dialog - Enhanced to support confirmation mode
function showModal(title, placeholder = '', defaultValue = '', isConfirmation = false, okLabel = null) {
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
            okBtn.textContent = okLabel ?? 'Remove';
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

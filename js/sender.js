(function () {
    const sendBtn = document.getElementById('send-btn');
    const webhookModal = document.getElementById('webhook-modal');
    const modalClose = document.getElementById('modal-close');
    const modalCancel = document.getElementById('modal-cancel');
    const modalSave = document.getElementById('modal-save');
    const webhookInput = document.getElementById('webhook-url');
    const loadingOverlay = document.getElementById('loading-overlay');

    function showToast(msg, type = 'success') {
        Toastify({
            text: msg,
            duration: 4000,
            gravity: 'bottom',
            position: 'right',
            style: {
                background: type === 'success'
                    ? 'linear-gradient(135deg, #4caf50, #2e7d32)'
                    : type === 'error'
                    ? 'linear-gradient(135deg, #e53935, #b71c1c)'
                    : 'linear-gradient(135deg, #ff9800, #e65100)',
                borderRadius: '10px',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.88rem',
                fontWeight: '500',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                padding: '12px 20px'
            }
        }).showToast();
    }

    function openModal() {
        const saved = Storage.get(Storage.KEYS.WEBHOOK, '');
        webhookInput.value = saved;
        webhookModal.classList.add('active');
        setTimeout(() => webhookInput.focus(), 200);
    }

    function closeModal() {
        webhookModal.classList.remove('active');
    }

    function showLoading() {
        loadingOverlay.classList.add('active');
    }

    function hideLoading() {
        loadingOverlay.classList.remove('active');
    }

    // Build offscreen clone for capture
    function createRenderClone() {
        const existing = document.querySelector('.offscreen-render');
        if (existing) existing.remove();

        const div = document.createElement('div');
        div.className = 'offscreen-render';
        div.innerHTML = quill.root.innerHTML;
        document.body.appendChild(div);
        return div;
    }

    // Generate image blob from html content
    async function generateImage(htmlContent) {
        const clone = createRenderClone();

        const canvas = await html2canvas(clone, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            width: 900,
            windowWidth: 900
        });

        clone.remove();

        // Check size and reduce quality if needed
        let quality = 0.95;
        let blob;

        do {
            blob = await new Promise(resolve =>
                canvas.toBlob(resolve, 'image/png')
            );

            if (blob.size > 8 * 1024 * 1024 && quality > 0.3) {
                // Convert to JPEG with reduced quality
                blob = await new Promise(resolve =>
                    canvas.toBlob(resolve, 'image/jpeg', quality)
                );
                quality -= 0.1;
            } else {
                break;
            }
        } while (blob.size > 8 * 1024 * 1024 && quality > 0.3);

        // If still too big, reduce scale
        if (blob.size > 8 * 1024 * 1024) {
            const smallerCanvas = document.createElement('canvas');
            const ratio = Math.sqrt((7.5 * 1024 * 1024) / blob.size);
            smallerCanvas.width = canvas.width * ratio;
            smallerCanvas.height = canvas.height * ratio;
            const sCtx = smallerCanvas.getContext('2d');
            sCtx.drawImage(canvas, 0, 0, smallerCanvas.width, smallerCanvas.height);

            blob = await new Promise(resolve =>
                smallerCanvas.toBlob(resolve, 'image/jpeg', 0.9)
            );
        }

        return blob;
    }

    // Generate PDF blob
    async function generatePDF(htmlContent) {
        const { jsPDF } = window.jspdf;

        const clone = createRenderClone();

        const canvas = await html2canvas(clone, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            width: 900,
            windowWidth: 900
        });

        clone.remove();

        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        // A4 proportions
        const pdfWidth = 210;
        const pdfImgWidth = pdfWidth - 20; // 10mm margin each side
        const pdfImgHeight = (imgHeight / imgWidth) * pdfImgWidth;

        const pdf = new jsPDF({
            orientation: pdfImgHeight > pdfImgWidth * 1.5 ? 'portrait' : 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageHeight = pdf.internal.pageSize.getHeight() - 20; // margins
        let yOffset = 0;
        let remainingHeight = pdfImgHeight;
        let page = 0;

        while (remainingHeight > 0) {
            if (page > 0) pdf.addPage();

            const sourceY = (yOffset / pdfImgHeight) * imgHeight;
            const sourceH = Math.min(
                (pageHeight / pdfImgHeight) * imgHeight,
                imgHeight - sourceY
            );

            // Create a sub-canvas for this page segment
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = imgWidth;
            pageCanvas.height = sourceH;
            const pCtx = pageCanvas.getContext('2d');
            pCtx.drawImage(canvas, 0, sourceY, imgWidth, sourceH, 0, 0, imgWidth, sourceH);

            const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.92);
            const thisPageHeight = Math.min(pageHeight, remainingHeight);

            pdf.addImage(pageImgData, 'JPEG', 10, 10, pdfImgWidth, thisPageHeight);

            yOffset += pageHeight;
            remainingHeight -= pageHeight;
            page++;
        }

        return pdf.output('blob');
    }

    // Send to Discord webhook
    async function sendToDiscord(webhookUrl) {
        const text = quill.getText().trim();

        if (!text || text.length === 0) {
            showToast('Le texte est vide.', 'warning');
            return;
        }

        if (text.length > 2000) {
            showToast('Le texte dépasse 2000 caractères.', 'error');
            return;
        }

        showLoading();

        try {
            const htmlContent = quill.root.innerHTML;

            // Generate both files
            const [pdfBlob, imageBlob] = await Promise.all([
                generatePDF(htmlContent),
                generateImage(htmlContent)
            ]);

            // Build FormData
            const formData = new FormData();

            // Payload JSON for the message content
            const payload = {
                content: `📄 Nouveau message — ${new Date().toLocaleString('fr-FR')}`
            };
            formData.append('payload_json', JSON.stringify(payload));

            // Attach files
            formData.append('files[0]', pdfBlob, `document_${Date.now()}.pdf`);
            formData.append('files[1]', imageBlob, `apercu_${Date.now()}.png`);

            const response = await fetch(webhookUrl, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Erreur ${response.status}: ${err}`);
            }

            showToast('Envoyé avec succès !', 'success');

        } catch (error) {
            console.error('Send error:', error);
            showToast(`Échec de l'envoi : ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    }

    // Event listeners
    sendBtn.addEventListener('click', () => {
        const text = quill.getText().trim();

        if (!text || text.length === 0) {
            showToast('Écrivez quelque chose avant d\'envoyer.', 'warning');
            return;
        }

        if (text.length > 2000) {
            showToast('Le texte dépasse la limite de 2000 caractères.', 'error');
            return;
        }

        const webhookUrl = 'https://discord.com/api/webhooks/1472263999948062801/AMW1qzMdhvxlfmMEELKIpisdpdU5p4TdEkECxRMlBE7T6a6Zn8-AeiOQhSPtWSLtVqXP';
        sendToDiscord(webhookUrl);
    });

    modalClose.addEventListener('click', closeModal);
    modalCancel.addEventListener('click', closeModal);

    webhookModal.addEventListener('click', (e) => {
        if (e.target === webhookModal) closeModal();
    });

    modalSave.addEventListener('click', () => {
        const url = webhookInput.value.trim();

        if (!url.startsWith('https://discord.com/api/webhooks/')) {
            showToast('URL de webhook invalide.', 'error');
            webhookInput.focus();
            return;
        }

        Storage.set(Storage.KEYS.WEBHOOK, url);
        closeModal();
        sendToDiscord(url);
    });

    // Allow Enter in modal
    webhookInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            modalSave.click();
        }
    });

    // Escape closes modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && webhookModal.classList.contains('active')) {
            closeModal();
        }
    });
})();
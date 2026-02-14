let quill;

(function () {
    const CHAR_LIMIT = 2000;

    // Initialize Quill
    quill = new Quill('#editor-container', {
        theme: 'snow',
        placeholder: 'Commencez à écrire ici…',
        modules: {
            toolbar: [
                [{ header: [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ list: 'ordered' }, { list: 'bullet' }],
                ['blockquote'],
                [{ align: [] }],
                ['clean']
            ]
        }
    });

    const charCountEl = document.getElementById('char-count');

    function updateCharCount() {
        const text = quill.getText().trim();
        const len = text.length;
        charCountEl.textContent = `${len} / ${CHAR_LIMIT}`;

        charCountEl.classList.remove('warning', 'danger');
        if (len > CHAR_LIMIT) {
            charCountEl.classList.add('danger');
        } else if (len > CHAR_LIMIT * 0.85) {
            charCountEl.classList.add('warning');
        }
    }

    // Restore saved content
    const savedContent = Storage.get(Storage.KEYS.CONTENT);
    if (savedContent) {
        quill.root.innerHTML = savedContent;
    }
    updateCharCount();

    // Save content on change + enforce limit
    let saveTimeout;
    quill.on('text-change', () => {
        const text = quill.getText().trim();

        // Enforce character limit
        if (text.length > CHAR_LIMIT) {
            quill.deleteText(CHAR_LIMIT, quill.getLength() - 1);
        }

        updateCharCount();

        // Debounced save
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            Storage.set(Storage.KEYS.CONTENT, quill.root.innerHTML);
        }, 400);
    });
})();
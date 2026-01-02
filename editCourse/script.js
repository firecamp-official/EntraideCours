document.addEventListener('DOMContentLoaded', () => {
    const themeBtn = document.getElementById('toggle-theme');
    const fontSelect = document.getElementById('font-select');
    const textColorInput = document.getElementById('text-color');
    const textMarginSelect = document.getElementById('text-margin');
    const resetBtn = document.getElementById('reset-fiche');
    const paletteSelect = document.getElementById('palette-select');

    // 🌈 Palettes
    const palettes = ['light', 'dark', 'pastel', 'solar'];
    function applyPalette(name) {
        document.body.classList.remove(...palettes);
        document.body.classList.add(name);
        localStorage.setItem('palette', name);
        themeBtn.textContent = name === 'dark' ? '☀️ Mode Jour' : '🌙 Mode Nuit';
    }

    // Initialisation palette
    const savedPalette = localStorage.getItem('palette') || 'light';
    applyPalette(savedPalette);
    paletteSelect.value = savedPalette;

    // Quand on change la palette via le select
    paletteSelect.addEventListener('change', e => applyPalette(e.target.value));

    // Toggle rapide avec le bouton thème
    themeBtn.addEventListener('click', () => {
        if (document.body.classList.contains('dark')) applyPalette('light');
        else applyPalette('dark');
    });

    // 💾 Sauvegarde automatique du contenu éditable
    function saveEditableContent(el) {
        const key = el.id;
        if (localStorage.getItem(key)) el.innerHTML = localStorage.getItem(key);
        el.addEventListener('input', () => localStorage.setItem(key, el.innerHTML));
    }
    document.querySelectorAll('[contenteditable="true"]').forEach(saveEditableContent);

    // ➕ Ajouter section
    const addSectionBtn = document.getElementById('add-section');
    addSectionBtn.addEventListener('click', () => createSection());

    function createSection(type = null, id = null, savedContent = null, savedImg = null) {
        const sectionType = type || prompt('Type de section ? (texte, liste, code, retenir, image)', 'texte');
        if (!sectionType) return;

        const newSection = document.createElement('section');
        newSection.classList.add('card');
        newSection.id = id || 'section-' + Date.now();
        newSection.contentEditable = true;

        if (savedContent) newSection.innerHTML = savedContent;

        if (!savedContent) {
            const h2Text = prompt('Titre de la section', 'Nouvelle section');
            newSection.innerHTML = `<h2>${h2Text}</h2>`;
            switch (sectionType.toLowerCase()) {
                case 'texte': newSection.innerHTML += `<p>Votre contenu ici...</p>`; break;
                case 'liste': newSection.innerHTML += `<ul><li>Point 1</li><li>Point 2</li></ul>`; break;
                case 'code': newSection.innerHTML += `<pre><code class="code-block">console.log('Hello NSI!');</code></pre>`; break;
                case 'retenir': newSection.classList.add('highlight'); newSection.innerHTML += `<p>À retenir...</p>`; break;
                case 'image':
                    newSection.contentEditable = false;
                    const uploadInput = document.createElement('input');
                    uploadInput.type = 'file';
                    uploadInput.accept = 'image/*';
                    uploadInput.style.marginTop = '1rem';
                    const img = document.createElement('img');
                    img.style.maxWidth = '100%';
                    img.style.borderRadius = '12px';
                    img.style.marginTop = '1rem';
                    img.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                    if (savedImg) img.src = savedImg;

                    uploadInput.addEventListener('change', e => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => {
                            img.src = ev.target.result;
                            localStorage.setItem(newSection.id + '_img', img.src);
                            localStorage.setItem(newSection.id, newSection.innerHTML);
                        };
                        reader.readAsDataURL(file);
                    });

                    newSection.appendChild(uploadInput);
                    newSection.appendChild(img);
                    break;
                default: newSection.innerHTML += `<p>Votre contenu ici...</p>`;
            }
        }

        addDeleteButton(newSection);
        newSection.setAttribute('draggable', true);
        document.getElementById('fiche-content').appendChild(newSection);

        if (sectionType.toLowerCase() !== 'image') {
            newSection.addEventListener('input', () => localStorage.setItem(newSection.id, newSection.innerHTML));
        }
    }

    // ❌ Bouton supprimer
    function addDeleteButton(section) {
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'X';
        deleteBtn.classList.add('delete-btn');
        section.appendChild(deleteBtn);
        deleteBtn.addEventListener('click', e => {
            e.stopPropagation();
            if (confirm('Supprimer cette section ?')) {
                localStorage.removeItem(section.id);
                localStorage.removeItem(section.id + '_img');
                section.remove();
            }
        });
    }

    // Restaurer sections
    for (let key in localStorage) {
        if (key.startsWith('section-') && !key.endsWith('_img')) {
            createSection(null, key, localStorage.getItem(key), localStorage.getItem(key + '_img'));
        }
    }

    // Add delete buttons to any existing static or loaded sections that don't have one
    document.querySelectorAll('#fiche-content .card').forEach(section => {
        if (!section.querySelector('.delete-btn')) addDeleteButton(section);
    });

    // Coller image
    document.addEventListener('paste', e => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                const reader = new FileReader();
                reader.onload = ev => createSection('image', null, null, ev.target.result);
                reader.readAsDataURL(file);
            }
        }
    });

    // Drag & drop
    let draggedSection = null;
    document.addEventListener('dragstart', e => {
        if (e.target.classList.contains('card')) {
            draggedSection = e.target;
            e.dataTransfer.effectAllowed = 'move';
            e.target.style.opacity = '0.5';
        }
    });
    document.addEventListener('dragend', e => {
        if (draggedSection) draggedSection.style.opacity = '1';
        draggedSection = null;
    });
    document.addEventListener('dragover', e => {
        e.preventDefault();
        const target = e.target.closest('.card');
        const container = document.getElementById('fiche-content');
        if (target && draggedSection && target !== draggedSection) {
            const rect = target.getBoundingClientRect();
            const next = e.clientY > rect.top + rect.height / 2;
            container.insertBefore(draggedSection, next ? target.nextSibling : target);
        }
    });

    // Export PDF
    document.getElementById('export-pdf').addEventListener('click', async () => {
        const element = document.getElementById('fiche-content');
        document.body.classList.add('pdf-mode');
        const { jsPDF } = window.jspdf;
        const canvas = await html2canvas(element, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
        const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        let position = 0;
        while (position < canvasHeight) {
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvasWidth;
            pageCanvas.height = Math.min((pdfHeight * canvasWidth) / pdfWidth, canvasHeight - position);
            const ctx = pageCanvas.getContext('2d');
            ctx.drawImage(canvas, 0, position, canvasWidth, pageCanvas.height, 0, 0, canvasWidth, pageCanvas.height);
            const pageImg = pageCanvas.toDataURL('image/jpeg', 1.0);
            if (position > 0) pdf.addPage();
            pdf.addImage(pageImg, 'JPEG', 0, 0, pdfWidth, (pageCanvas.height * pdfWidth) / canvasWidth);
            position += pageCanvas.height;
        }
        pdf.save(`${document.getElementById('chapter-title').innerText || 'Fiche_NSI'}.pdf`);
        document.body.classList.remove('pdf-mode');
    });

    // Toolbar : police, couleur, marge
    fontSelect.value = localStorage.getItem('font') || 'Poppins';
    document.body.style.fontFamily = fontSelect.value;
    fontSelect.addEventListener('change', e => {
        document.body.style.fontFamily = e.target.value;
        localStorage.setItem('font', e.target.value);
    });

    textColorInput.value = localStorage.getItem('textColor') || '#2C2C2C';
    document.body.style.color = textColorInput.value;
    textColorInput.addEventListener('input', e => {
        document.body.style.color = e.target.value;
        localStorage.setItem('textColor', e.target.value);
    });

    textMarginSelect.value = localStorage.getItem('textMargin') || '1rem';
    document.querySelectorAll('.card p, .card ul, .card pre').forEach(el => el.style.margin = textMarginSelect.value);
    textMarginSelect.addEventListener('change', e => {
        document.querySelectorAll('.card p, .card ul, .card pre').forEach(el => el.style.margin = e.target.value);
        localStorage.setItem('textMargin', e.target.value);
    });

    // Réinitialiser fiche
    resetBtn.addEventListener('click', () => {
        if (confirm('Tout supprimer et réinitialiser la fiche ?')) {
            localStorage.clear();
            location.reload();
        }
    });
    /* ===============================
   TOOLBAR INTERACTIONS
================================ */

    const toggle = document.querySelector(".toolbar-toggle");
    const toolbar = document.querySelector(".toolbar");

    if (toggle && toolbar) {

        // Toggle bouton
        toggle.addEventListener("click", (e) => {
            e.stopPropagation();
            toolbar.classList.toggle("active");
            toggle.classList.toggle("active");
        });

        // Clic dans la toolbar → ne ferme pas
        toolbar.addEventListener("click", e => e.stopPropagation());

        // Clic ailleurs → ferme
        document.addEventListener("click", () => {
            toolbar.classList.remove("active");
            toggle.classList.remove("active");
        });

        // ESC → ferme
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                toolbar.classList.remove("active");
                toggle.classList.remove("active");
            }
        });

        // Swipe down mobile
        let startY = 0;

        toolbar.addEventListener("touchstart", (e) => {
            startY = e.touches[0].clientY;
        });

        toolbar.addEventListener("touchmove", (e) => {
            const deltaY = e.touches[0].clientY - startY;
            if (deltaY > 80) {
                toolbar.classList.remove("active");
                toggle.classList.remove("active");
            }
        });
    }

});



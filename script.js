"use strict";

window.addEventListener('error', function(event) {
    console.error("GreenMeans App Error:", event.error);
    const saveStatus = document.getElementById('save-status');
    if (saveStatus) {
        saveStatus.innerText = '⚠️ Warning: An error occurred. Please save your work.';
        saveStatus.style.color = '#ef4444';
    }
});

window.addEventListener('unhandledrejection', function(event) {
    console.error("GreenMeans Async Error:", event.reason);
    const saveStatus = document.getElementById('save-status');
    if (saveStatus) {
        saveStatus.innerText = '⚠️ Warning: An background error occurred.';
        saveStatus.style.color = '#ef4444';
    }
});

(function() {
    // Encourage paragraphs instead of divs or bare text
    document.execCommand('defaultParagraphSeparator', false, 'p');

    // === DOM ELEMENTS ===
    const docWrapper = document.getElementById('document-wrapper');
    const editor = docWrapper;
    const docTitle = document.getElementById('document-title');
    const toolbar = document.querySelector('.app-toolbar');
    
    // Buttons & Inputs
    const colorPickers = {
        text: document.getElementById('text-color'),
        bg: document.getElementById('bg-color')
    };
    const formatBlockSelect = document.getElementById('format-block');
    const fontFamilySelect = document.getElementById('font-family');
    const fontSizeSelect = document.getElementById('font-size');
    const btnOpenDoc = document.getElementById('btn-open-doc');
    const fileOpenInput = document.getElementById('file-open-input');
    const btnNewDoc = document.getElementById('btn-new-doc');
    const btnPrint = document.getElementById('btn-print');
    const menuToggleBtn = document.getElementById('btn-menu-toggle');
    const headerMenuContent = document.getElementById('header-menu-content');
    
    // Status bar
    const saveStatus = document.getElementById('save-status');
    const wordCountEl = document.getElementById('word-count');
    const charCountEl = document.getElementById('char-count');
    const charNoSpaceEl = document.getElementById('char-count-no-space');
    const paraCountEl = document.getElementById('paragraph-count');
    const readTimeEl = document.getElementById('reading-time');
    
    // Features
    const saveMenuBtn = document.getElementById('btn-save-menu');
    const saveDropdown = document.getElementById('save-dropdown');
    const tableBtn = document.getElementById('btn-insert-table');
    const tablePicker = document.getElementById('table-picker');
    const tableGrid = document.querySelector('.table-grid');
    const tableSizeLabel = document.querySelector('.table-size-label');
    const tableToolbar = document.getElementById('table-toolbar');
    const imageBtn = document.getElementById('btn-insert-image');
    const linkBtn = document.getElementById('btn-insert-link');
    const btnInsertHtml = document.getElementById('btn-insert-html');
    const btnHeadingInc = document.getElementById('btn-heading-inc');
    const btnHeadingDec = document.getElementById('btn-heading-dec');
    const imageUpload = document.getElementById('image-upload');
    const imageResizer = document.getElementById('image-resizer');

    // Find & Replace
    const frBtn = document.getElementById('btn-find-replace');
    const frPanel = document.getElementById('find-replace-panel');
    const frClose = document.getElementById('btn-close-find');
    const fInput = document.getElementById('find-input');
    const rInput = document.getElementById('replace-input');
    const fCount = document.getElementById('find-count');
    const btnFPrev = document.getElementById('btn-find-prev');
    const btnFNext = document.getElementById('btn-find-next');
    const btnReplace = document.getElementById('btn-replace');
    const btnReplaceAll = document.getElementById('btn-replace-all');
    const matchCase = document.getElementById('match-case');

    // === INIT ===
    function init() {
        // Load from local storage
        const savedData = localStorage.getItem('greenmeans_doc');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                if (data.content) {
                    editor.innerHTML = data.content;
                    initPages();
                }
                if (data.title) {
                    docTitle.innerText = data.title;
                    document.title = `${data.title} - GreenMeans: Docs`;
                }
                if (data.lastSaved) saveStatus.innerText = `Last saved: ${new Date(data.lastSaved).toLocaleTimeString()}`;
            } catch (e) {
                console.error("Could not parse saved document", e);
            }
        }
        
        if (!docTitle.innerText.trim()) {
            document.title = 'Untitled Document - GreenMeans: Docs';
        }
        
        // Initial defaults
        if (!editor.innerText.trim() && !editor.querySelector('img, table, hr')) {
            editor.innerHTML = '<div class="editor-page" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Document Content"><p><br></p></div>';
            initPages();
        }

        updateWordCount();
        initTablePicker();
        
        // Load undo/redo history
        const loaded = loadHistoryFromLocalStorage();
        if (!loaded || historyStack.length === 0) {
            saveHistoryState();
        }
    }

    function focusEditor() {
        const focusNode = document.activeElement.classList?.contains('editor-page') ? document.activeElement : (docWrapper.querySelector('.editor-page:last-child') || docWrapper);
        if (focusNode && focusNode.focus) focusNode.focus();
    }

    // === TOOLBAR ===
    // Handle standard commands
    toolbar.addEventListener('mousedown', (e) => {
        const btnNode = e.target.closest('button, select, input');
        if (btnNode) {
            // Prevent editor focus loss except for inputs/selects that need focus
            if (btnNode.tagName.toLowerCase() !== 'input' && btnNode.tagName.toLowerCase() !== 'select') {
                 e.preventDefault();
            } else if (btnNode.tagName.toLowerCase() === 'input' && btnNode.type === 'color') {
                 e.preventDefault();
            }
        }
        
        const btn = e.target.closest('.toolbar-btn[data-command]');
        if (!btn) return;
        
        const cmd = btn.getAttribute('data-command');
        saveHistoryState();
        document.execCommand(cmd, false, null);
        const focusNode = document.activeElement.classList.contains('editor-page') ? document.activeElement : (editor.querySelector('.editor-page:last-child') || editor);
        if (focusNode && focusNode.focus) focusNode.focus();
        updateToolbarState();
        triggerAutosave();
        saveHistoryStateDebounced();
    });

    formatBlockSelect.addEventListener('change', (e) => {
        e.preventDefault();
        const val = e.target.value;
        const tag = (val === 'P' || val === 'BLOCKQUOTE') ? val : val;
        saveHistoryState();
        document.execCommand('formatBlock', false, tag);
        editor.focus();
        triggerAutosave();
        saveHistoryStateDebounced();
    });

    fontFamilySelect.addEventListener('change', (e) => {
        e.preventDefault();
        saveHistoryState();
        document.execCommand('fontName', false, e.target.value);
        editor.focus();
        triggerAutosave();
        saveHistoryStateDebounced();
    });

    fontSizeSelect.addEventListener('change', (e) => {
        e.preventDefault();
        saveHistoryState();
        document.execCommand('fontSize', false, e.target.value);
        editor.focus();
        triggerAutosave();
        saveHistoryStateDebounced();
    });

    if (linkBtn) {
        linkBtn.addEventListener('click', () => {
            const url = prompt('Enter URL:', 'https://');
            if (url) {
                saveHistoryState();
                document.execCommand('createLink', false, url);
                triggerAutosave();
                saveHistoryStateDebounced();
            }
        });
    }

    if (btnHeadingInc) {
        btnHeadingInc.addEventListener('click', () => changeHeadingLevel(1));
    }
    if (btnHeadingDec) {
        btnHeadingDec.addEventListener('click', () => changeHeadingLevel(-1));
    }

    function changeHeadingLevel(direction) {
        saveHistoryState();
        const levels = ['P', 'H4', 'H3', 'H2', 'H1'];
        let currentTag = document.queryCommandValue('formatBlock') || 'P';
        
        // Clean tag from <> brackets if returned that way
        currentTag = currentTag.replace(/[<>]/g, '').toUpperCase();
        if (currentTag === 'DIV' || !currentTag || currentTag === 'BODY') currentTag = 'P';
        
        let index = levels.indexOf(currentTag);
        if (index === -1) index = 0;
        
        let nextIndex = index + direction;
        if (nextIndex >= 0 && nextIndex < levels.length) {
            const nextTag = levels[nextIndex];
            document.execCommand('formatBlock', false, nextTag);
            if (formatBlockSelect) formatBlockSelect.value = nextTag;
            triggerAutosave();
            saveHistoryStateDebounced();
        }
    }

    // Insert HTML
    const htmlPanel = document.getElementById('insert-html-panel');
    const htmlClose = document.getElementById('btn-close-html');
    const htmlInput = document.getElementById('html-input');
    const htmlConfirm = document.getElementById('btn-confirm-html');

    btnInsertHtml.addEventListener('click', () => {
        htmlPanel.classList.toggle('hidden');
        if (!htmlPanel.classList.contains('hidden')) htmlInput.focus();
    });

    htmlClose.addEventListener('click', () => {
        htmlPanel.classList.add('hidden');
    });

    htmlConfirm.addEventListener('click', () => {
        const htmlCode = htmlInput.value;
        if (htmlCode) {
            saveHistoryState();
            document.execCommand('insertHTML', false, htmlCode);
            focusEditor();
            triggerAutosave();
            saveHistoryStateDebounced();
        }
        htmlPanel.classList.add('hidden');
        htmlInput.value = '';
    });

    colorPickers.text.addEventListener('input', (e) => {
        saveHistoryState();
        document.execCommand('foreColor', false, e.target.value);
        focusEditor();
        triggerAutosave();
        saveHistoryStateDebounced();
    });

    colorPickers.bg.addEventListener('input', (e) => {
        const cmd = document.queryCommandSupported('hiliteColor') ? 'hiliteColor' : 'backColor';
        saveHistoryState();
        document.execCommand(cmd, false, e.target.value);
        focusEditor();
        triggerAutosave();
        saveHistoryStateDebounced();
    });

    // Close dropdowns
    document.addEventListener('mousedown', (e) => {
        if (!saveDropdown.contains(e.target) && !saveMenuBtn.contains(e.target)) {
            saveDropdown.classList.add('hidden');
            saveMenuBtn.setAttribute('aria-expanded', 'false');
        }
        if (!tablePicker.contains(e.target) && !tableBtn.contains(e.target)) {
            tablePicker.classList.add('hidden');
            tableBtn.setAttribute('aria-expanded', 'false');
        }
        if (!tableToolbar.contains(e.target) && !isClickInsideTable(e.target)) {
            tableToolbar.classList.add('hidden');
            currentTableCell = null;
        }
        if (!e.target.closest('img') && !e.target.closest('.image-resizer')) {
            clearImageSelection();
        }
        if (menuToggleBtn && headerMenuContent && !headerMenuContent.contains(e.target) && !menuToggleBtn.contains(e.target)) {
            headerMenuContent.classList.remove('active');
            menuToggleBtn.setAttribute('aria-expanded', 'false');
        }
    });

    if (menuToggleBtn && headerMenuContent) {
        menuToggleBtn.addEventListener('click', () => {
            const isExpanded = menuToggleBtn.getAttribute('aria-expanded') === 'true';
            menuToggleBtn.setAttribute('aria-expanded', !isExpanded);
            headerMenuContent.classList.toggle('active');
        });
    }

    saveMenuBtn.addEventListener('click', () => {
        const expanded = saveMenuBtn.getAttribute('aria-expanded') === 'true';
        saveDropdown.classList.toggle('hidden');
        saveMenuBtn.setAttribute('aria-expanded', !expanded);
    });

    // === FORMATTING ===
    editor.addEventListener('keyup', updateToolbarState);
    editor.addEventListener('mouseup', updateToolbarState);
    editor.addEventListener('focus', updateToolbarState);

    function updateToolbarState() {
        const commands = ['bold', 'italic', 'underline', 'strikeThrough', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull', 'insertUnorderedList', 'insertOrderedList'];
        commands.forEach(cmd => {
            const state = document.queryCommandState(cmd);
            const btn = document.querySelector(`.toolbar-btn[data-command="${cmd}"]`);
            if (btn) btn.classList.toggle('active', state);
        });

        // Format Block
        const formatBtn = document.queryCommandValue('formatBlock');
        if (formatBtn) {
            let val = 'P';
            const f = formatBtn.toLowerCase();
            if (f === 'h1') val = 'H1';
            else if (f === 'h2') val = 'H2';
            else if (f === 'h3') val = 'H3';
            else if (f === 'h4') val = 'H4';
            else if (f === 'blockquote') val = 'BLOCKQUOTE';
            formatBlockSelect.value = val;
        }

        // Font Size
        const fontSizeBtn = document.queryCommandValue('fontSize');
        if (fontSizeBtn) {
            fontSizeSelect.value = fontSizeBtn;
        }

        // Font Family
        const fontNameBtn = document.queryCommandValue('fontName');
        if (fontNameBtn) {
            const fontVal = fontNameBtn.replace(/['"]/g, '').toLowerCase();
            let matched = false;
            Array.from(fontFamilySelect.options).forEach(opt => {
                if (!opt.value) return;
                const optVal = opt.value.replace(/['"]/g, '').toLowerCase();
                if (optVal.startsWith(fontVal) || fontVal.startsWith(optVal.split(',')[0].trim())) {
                    fontFamilySelect.value = opt.value;
                    matched = true;
                }
            });
            if (!matched) fontFamilySelect.value = '';
        }
    }

    // === TABLES ===
    function initTablePicker() {
        for (let r = 1; r <= 8; r++) {
            for (let c = 1; c <= 8; c++) {
                const cell = document.createElement('div');
                cell.className = 'table-cell-picker';
                cell.dataset.rows = r;
                cell.dataset.cols = c;
                tableGrid.appendChild(cell);
            }
        }
    }

    tableBtn.addEventListener('click', () => {
        const expanded = tableBtn.getAttribute('aria-expanded') === 'true';
        tablePicker.classList.toggle('hidden');
        tableBtn.setAttribute('aria-expanded', !expanded);
    });

    tablePicker.addEventListener('mouseover', (e) => {
        if (!e.target.classList.contains('table-cell-picker')) return;
        const R = parseInt(e.target.dataset.rows);
        const C = parseInt(e.target.dataset.cols);
        tableSizeLabel.innerText = `${C} × ${R}`;
        
        document.querySelectorAll('.table-cell-picker').forEach(cell => {
            const cellR = parseInt(cell.dataset.rows);
            const cellC = parseInt(cell.dataset.cols);
            if (cellR <= R && cellC <= C) {
                cell.classList.add('selected');
            } else {
                cell.classList.remove('selected');
            }
        });
    });

    tablePicker.addEventListener('mousedown', (e) => {
        e.preventDefault(); // prevent editor focus loss
    });

    tablePicker.addEventListener('click', (e) => {
        if (!e.target.classList.contains('table-cell-picker')) return;
        const R = parseInt(e.target.dataset.rows);
        const C = parseInt(e.target.dataset.cols);
        saveHistoryState();
        insertTable(R, C);
        tablePicker.classList.add('hidden');
        triggerAutosave();
        saveHistoryStateDebounced();
    });

    function insertTable(rows, cols) {
        let html = '<table contenteditable="false">';
        html += '<thead><tr>';
        for (let c = 0; c < cols; c++) html += `<th contenteditable="true">Header</th>`;
        html += '</tr></thead><tbody>';
        for (let r = 0; r < rows - 1; r++) {
            html += '<tr>';
            for (let c = 0; c < cols; c++) html += `<td contenteditable="true">Cell</td>`;
            html += '</tr>';
        }
        html += '</tbody></table><p><br></p>';
        document.execCommand('insertHTML', false, html);
    }

    let currentTableCell = null;

    function isClickInsideTable(target) {
        return target.closest('th') || target.closest('td') || target.closest('table');
    }

    editor.addEventListener('click', (e) => {
        const cell = e.target.closest('td, th');
        if (cell) {
            currentTableCell = cell;
            const rect = cell.getBoundingClientRect();
            tableToolbar.style.top = `${rect.top + window.scrollY - tableToolbar.offsetHeight - 5}px`;
            tableToolbar.style.left = `${rect.left + window.scrollX}px`;
            tableToolbar.classList.remove('hidden');
        }
    });

    tableToolbar.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn || !currentTableCell) return;
        const action = btn.dataset.action;
        const tr = currentTableCell.closest('tr');
        const defaultTable = currentTableCell.closest('table');
        const cellIndex = currentTableCell.cellIndex;

        if (action === 'del-table') {
            defaultTable.remove();
            tableToolbar.classList.add('hidden');
        } else if (action === 'row-above' || action === 'row-below') {
            const isHeader = currentTableCell.tagName.toLowerCase() === 'th';
            const newRow = document.createElement('tr');
            Array.from(tr.children).forEach(() => {
                const td = document.createElement('td');
                td.contentEditable = "true";
                td.innerText = "Cell";
                newRow.appendChild(td);
            });
            if (action === 'row-above') {
                 if (isHeader) defaultTable.querySelector('tbody').prepend(newRow);
                 else tr.before(newRow);
            } else {
                tr.after(newRow);
            }
        } else if (action === 'col-left' || action === 'col-right') {
            Array.from(defaultTable.rows).forEach(row => {
                const cellType = row.closest('thead') ? 'th' : 'td';
                const newCell = document.createElement(cellType);
                newCell.contentEditable = "true";
                newCell.innerText = cellType === 'th' ? "Header" : "Cell";
                
                const targetCell = row.cells[cellIndex];
                if (targetCell) {
                   if (action === 'col-left') targetCell.before(newCell);
                   else targetCell.after(newCell);
                }
            });
        } else if (action === 'del-row') {
            if (tr.closest('thead')) return; // Prevent deleting header
            tr.remove();
        } else if (action === 'del-col') {
            Array.from(defaultTable.rows).forEach(row => {
                 if(row.cells[cellIndex]) row.cells[cellIndex].remove();
            });
        }
        triggerAutosave();
        tableToolbar.classList.add('hidden');
        currentTableCell = null;
    });

    // === IMAGES ===
    imageBtn.addEventListener('click', () => {
        imageUpload.click();
    });

    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) insertImageFile(file);
        e.target.value = '';
    });

    editor.addEventListener('paste', (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                insertImageFile(items[i].getAsFile());
                break;
            }
        }
    });

    function insertImageFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            saveHistoryState();
            document.execCommand('insertImage', false, e.target.result);
            triggerAutosave();
            saveHistoryStateDebounced();
        };
        reader.readAsDataURL(file);
    }

    let currentResizingImage = null;
    
    editor.addEventListener('mousedown', (e) => {
        if (e.target.tagName.toLowerCase() === 'img') {
            selectImage(e.target);
            e.preventDefault();
        }
    });

    function selectImage(img) {
        clearImageSelection();
        currentResizingImage = img;
        img.classList.add('image-selected');
        updateResizerPosition();
        imageResizer.classList.remove('hidden');
    }

    function clearImageSelection() {
        if (currentResizingImage) {
            currentResizingImage.classList.remove('image-selected');
            currentResizingImage = null;
            imageResizer.classList.add('hidden');
        }
    }

    function updateResizerPosition() {
        if (!currentResizingImage) return;
        const rect = currentResizingImage.getBoundingClientRect();
        imageResizer.style.top = `${rect.top + window.scrollY}px`;
        imageResizer.style.left = `${rect.left + window.scrollX}px`;
        imageResizer.style.width = `${rect.width}px`;
        imageResizer.style.height = `${rect.height}px`;
    }

    window.addEventListener('resize', updateResizerPosition);
    editor.addEventListener('scroll', updateResizerPosition);

    let isResizing = false;
    let startX, startW;

    imageResizer.addEventListener('mousedown', (e) => {
        if (!e.target.classList.contains('resize-handle')) return;
        isResizing = true;
        startX = e.clientX;
        startW = currentResizingImage.offsetWidth;
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing || !currentResizingImage) return;
        const dx = e.clientX - startX;
        let newW = startW + dx;
        currentResizingImage.style.width = `${newW}px`;
        currentResizingImage.style.height = 'auto'; // keep aspect ratio
        updateResizerPosition();
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            triggerAutosave();
        }
    });

    // === FIND & REPLACE ===
    let findMatches = [];
    let currentMatchIndex = -1;

    frBtn.addEventListener('click', () => {
        frPanel.classList.toggle('hidden');
        if (!frPanel.classList.contains('hidden')) fInput.focus();
        else clearFindHighlights();
    });

    frClose.addEventListener('click', () => {
        frPanel.classList.add('hidden');
        clearFindHighlights();
    });

    fInput.addEventListener('input', performFind);
    matchCase.addEventListener('change', performFind);

    btnFNext.addEventListener('click', () => {
        if (findMatches.length === 0) return;
        currentMatchIndex = (currentMatchIndex + 1) % findMatches.length;
        updateCurrentMatchHighlight();
    });

    btnFPrev.addEventListener('click', () => {
        if (findMatches.length === 0) return;
        currentMatchIndex = (currentMatchIndex - 1 + findMatches.length) % findMatches.length;
        updateCurrentMatchHighlight();
    });

    btnReplace.addEventListener('click', () => {
        if (findMatches.length > 0 && currentMatchIndex >= 0) {
            replaceMatch(findMatches[currentMatchIndex], rInput.value);
            performFind();
            triggerAutosave();
        }
    });

    btnReplaceAll.addEventListener('click', () => {
        if (findMatches.length === 0) return;
        for (let i = findMatches.length - 1; i >= 0; i--) {
            replaceMatch(findMatches[i], rInput.value);
        }
        performFind();
        triggerAutosave();
    });

    function clearFindHighlights() {
        const marks = editor.querySelectorAll('mark.fr-match');
        marks.forEach(mark => {
            const parent = mark.parentNode;
            while(mark.firstChild) parent.insertBefore(mark.firstChild, mark);
            parent.removeChild(mark);
        });
        editor.normalize();
        findMatches = [];
        currentMatchIndex = -1;
        fCount.innerText = '0 of 0';
    }

    function performFind() {
        clearFindHighlights();
        const term = fInput.value;
        if (!term) return;

        const isCase = matchCase.checked;
        const regex = new RegExp(`(${escapeRegExp(term)})`, isCase ? 'g' : 'gi');

        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
        const nodesToProcess = [];
        let node;
        while(node = walker.nextNode()) nodesToProcess.push(node);

        nodesToProcess.forEach(textNode => {
            if (textNode.parentNode && textNode.parentNode.tagName === 'MARK') return;
            const text = textNode.nodeValue;
            if (regex.test(text)) {
                const span = document.createElement('span');
                span.innerHTML = text.replace(regex, '<mark class="fr-match">$1</mark>');
                textNode.parentNode.replaceChild(span, textNode);
                
                while (span.firstChild) span.parentNode.insertBefore(span.firstChild, span);
                span.parentNode.removeChild(span);
            }
        });

        findMatches = Array.from(editor.querySelectorAll('mark.fr-match'));
        if (findMatches.length > 0) {
            currentMatchIndex = 0;
            updateCurrentMatchHighlight();
        } else {
            fCount.innerText = '0 of 0';
        }
    }

    function updateCurrentMatchHighlight() {
        findMatches.forEach(m => m.classList.remove('current-match'));
        if (findMatches[currentMatchIndex]) {
            const current = findMatches[currentMatchIndex];
            current.classList.add('current-match');
            current.scrollIntoView({ behavior: "smooth", block: "center" });
            fCount.innerText = `${currentMatchIndex + 1} of ${findMatches.length}`;
        }
    }

    function replaceMatch(markElem, replacement) {
        const txt = document.createTextNode(replacement);
        markElem.parentNode.replaceChild(txt, markElem);
    }
    
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // === EXPORT & SAVE ===
    saveDropdown.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') return;
        const format = e.target.dataset.export;
        if (!format) return;

        clearFindHighlights();
        const title = (docTitle.innerText.trim() || 'Untitled').replace(/[^\w\s-]/gi, '-');
        const filename = `${title}.${format}`;

        let content = '';
        let mime = 'text/plain';

        // Extract and combine the clean document content sequence across all pages, stripping page border wrappers
        let combinedHtml = '';
        const pages = editor.querySelectorAll('.editor-page');
        if (pages.length > 0) {
            pages.forEach(page => {
                combinedHtml += page.innerHTML;
            });
        } else {
            combinedHtml = editor.innerHTML;
        }

        if (format === 'txt') {
            content = editor.innerText;
        } else if (format === 'html') {
            mime = 'text/html';
            content = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<style>
body { font-family: Georgia, 'Times New Roman', serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; }
h1, h2, h3 { font-family: system-ui, sans-serif; font-weight: 300; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; }
th, td { border: 1px solid #ddd; padding: 0.5rem; }
th { background-color: #18832b; color: white; }
img { max-width: 100%; height: auto; }
</style>
<title>${title}</title>
</head>
<body>
<h1>${title}</h1>
${combinedHtml}
</body>
</html>`;
        } else if (format === 'md') {
            mime = 'text/markdown';
            content = `> ${title}\n\n` + htmlToMarkdown(combinedHtml);
        } else if (format === 'rtf') {
            mime = 'application/rtf';
            content = htmlToRtf(combinedHtml);
        } else if (format === 'docx') {
            const titleXml = escapeXml(docTitle.innerText.trim() || 'Untitled');
            const docxContentXml = htmlToDocxXml(combinedHtml, titleXml);
            
            const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

            const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

            const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="56"/><w:szCs w:val="56"/></w:rPr><w:t xml:space="preserve">${titleXml}</w:t></w:r></w:p>
    ${docxContentXml}
  </w:body>
</w:document>`;
            
            const zipObj = {
                '[Content_Types].xml': contentTypesXml,
                '_rels/.rels': relsXml,
                'word/document.xml': documentXml
            };
            
            const zipped = createStoreZip(zipObj);
            content = new Blob([zipped], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }

        downloadBlob(content, filename, mime);
        saveDropdown.classList.add('hidden');
        saveMenuBtn.setAttribute('aria-expanded', 'false');
        if (headerMenuContent) {
            headerMenuContent.classList.remove('active');
        }
        if (menuToggleBtn) {
            menuToggleBtn.setAttribute('aria-expanded', 'false');
        }
    });

    function downloadBlob(content, filename, mime) {
        let blob = content;
        if (!(content instanceof Blob)) {
            blob = new Blob([content], { type: mime });
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    function htmlToMarkdown(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;

        function traverse(node, listIdx = 0) {
            if (node.nodeType === Node.TEXT_NODE) return node.textContent;
            if (node.nodeType !== Node.ELEMENT_NODE) return '';
            
            let childIdx = 1;
            let inner = Array.from(node.childNodes).map(child => {
                const isLi = child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'li';
                const passIdx = isLi ? childIdx++ : 0;
                return traverse(child, passIdx);
            }).join('');
            
            const tag = node.tagName.toLowerCase();
            switch (tag) {
                case 'p': case 'div': return `\n${inner}\n`;
                case 'b': case 'strong': return `**${inner}**`;
                case 'i': case 'em': return `_${inner}_`;
                case 'h1': return `\n# ${inner}\n`;
                case 'h2': return `\n## ${inner}\n`;
                case 'h3': return `\n### ${inner}\n`;
                case 'br': return `\n`;
                case 'li':
                    const bullet = node.parentNode && node.parentNode.tagName.toLowerCase() === 'ol'
                        ? `${listIdx || '1'}. `
                        : '- ';
                    return `${bullet}${inner}\n`;
                case 'ul': case 'ol': return `\n${inner}\n`;
                case 'img': return `![Image](${node.src})`;
                case 'hr': return `\n---\n`;
                default: return inner;
            }
        }
        return traverse(temp).replace(/\n{3,}/g, '\n\n').trim();
    }

    function htmlToRtf(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;

        function escapeRTF(str) {
            return str.replace(/[\\{}]/g, m => '\\' + m)
                      .replace(/\n/g, ' ')
                      .replace(/[\u0080-\uFFFF]/g, m => '\\uc1\\u' + m.charCodeAt(0) + '?');
        }

        function traverse(node, listIdx = 0) {
            if (node.nodeType === Node.TEXT_NODE) return escapeRTF(node.textContent);
            if (node.nodeType !== Node.ELEMENT_NODE) return '';
            
            let childIdx = 1;
            let inner = Array.from(node.childNodes).map(child => {
                const isLi = child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'li';
                const passIdx = isLi ? childIdx++ : 0;
                return traverse(child, passIdx);
            }).join('');
            
            const tag = node.tagName.toLowerCase();
            switch (tag) {
                case 'p': case 'div': return `{\\pard\\f0\\fs32 ${inner}\\par}\n`;
                case 'b': case 'strong': return `{\\b ${inner}}`;
                case 'i': case 'em': return `{\\i ${inner}}`;
                case 'u': return `{\\ul ${inner}}`;
                case 'h1': return `{\\pard\\b\\f0\\fs48 ${inner}\\par}\n`;
                case 'h2': return `{\\pard\\b\\f0\\fs40 ${inner}\\par}\n`;
                case 'h3': return `{\\pard\\b\\f0\\fs36 ${inner}\\par}\n`;
                case 'br': return `\\line\n`;
                case 'li':
                    const bullet = node.parentNode && node.parentNode.tagName.toLowerCase() === 'ol'
                        ? `${listIdx || '1'}. `
                        : '\\bullet  ';
                    return `{\\pard\\f0\\fs32 ${bullet}${inner}\\par}\n`;
                case 'hr': return `{\\pard \\brdrb \\brdrs \\brdrw10 \\brsp20 \\par}\n`;
                default: return inner;
            }
        }

        let rtf = "{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang1033{\\fonttbl{\\f0\\fnil\\fcharset0 Georgia;}}\n";
        rtf += "{\\*\\generator GreenMeans:Docs;}\\viewkind4\\uc1 \n";
        rtf += traverse(temp);
        rtf += "\n}";
        return rtf;
    }

    function escapeXml(unsafe) {
        return (unsafe || '').replace(/[<>&'"]/g, function (c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
                default: return c;
            }
        });
    }

    function htmlToDocxXml(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;

        function rgbToHex(rgb) {
            if (!rgb) return null;
            const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (match) {
                return ((1 << 24) + (parseInt(match[1]) << 16) + (parseInt(match[2]) << 8) + parseInt(match[3])).toString(16).slice(1).toUpperCase();
            }
            if (rgb.startsWith('#')) return rgb.replace('#', '').toUpperCase();
            return null;
        }

        function traverse(node, currentStyles, listIdx = 0) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = escapeXml(node.textContent);
                if (!text) return '';
                let rPr = '';
                if (currentStyles.fontFamily) {
                    const family = escapeXml(currentStyles.fontFamily.split(',')[0].replace(/['"]/g, '').trim());
                    rPr += `<w:rFonts w:ascii="${family}" w:hAnsi="${family}" w:cs="${family}"/>`;
                }
                if (currentStyles.b) rPr += '<w:b/>';
                if (currentStyles.i) rPr += '<w:i/>';
                if (currentStyles.u) rPr += '<w:u w:val="single"/>';
                if (currentStyles.color) rPr += `<w:color w:val="${currentStyles.color}"/>`;
                if (currentStyles.bgColor) rPr += `<w:shd w:val="clear" w:color="auto" w:fill="${currentStyles.bgColor}"/>`;
                if (currentStyles.sz) {
                    rPr += `<w:sz w:val="${currentStyles.sz}"/>`;
                    rPr += `<w:szCs w:val="${currentStyles.sz}"/>`;
                }
                
                return `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}<w:t xml:space="preserve">${text}</w:t></w:r>`;
            }
            if (node.nodeType !== Node.ELEMENT_NODE) return '';
            
            const tag = node.tagName.toLowerCase();
            const newStyles = { ...currentStyles };
            const pProps = {};
            
            if (tag === 'b' || tag === 'strong') newStyles.b = true;
            if (tag === 'i' || tag === 'em') newStyles.i = true;
            if (tag === 'u') newStyles.u = true;
            
            if (tag === 'h1') { newStyles.b = true; newStyles.sz = '48'; }
            if (tag === 'h2') { newStyles.b = true; newStyles.sz = '36'; }
            if (tag === 'h3') { newStyles.b = true; newStyles.sz = '28'; }

            // Parse execCommand font attributes
            if (tag === 'font') {
                if (node.getAttribute('color')) newStyles.color = rgbToHex(node.getAttribute('color')) || currentStyles.color;
                if (node.getAttribute('face')) newStyles.fontFamily = node.getAttribute('face');
                if (node.getAttribute('size')) {
                    const szMap = {1: '16', 2: '20', 3: '24', 4: '28', 5: '36', 6: '48', 7: '72'};
                    newStyles.sz = szMap[node.getAttribute('size')] || '24';
                }
            }
            
            // Parse inline styles
            if (node.style.color) {
                const hexColor = rgbToHex(node.style.color);
                if (hexColor) newStyles.color = hexColor;
            }
            if (node.style.backgroundColor) {
                const hexColor = rgbToHex(node.style.backgroundColor);
                if (hexColor) newStyles.bgColor = hexColor;
            }
            if (node.style.fontFamily) {
                newStyles.fontFamily = node.style.fontFamily;
            }
            if (node.style.fontSize) {
                const fsz = node.style.fontSize;
                const val = parseFloat(fsz);
                if (!isNaN(val)) {
                    if (fsz.includes('pt')) {
                        newStyles.sz = Math.round(val * 2).toString();
                    } else if (fsz.includes('em') || fsz.includes('rem')) {
                        newStyles.sz = Math.round(val * 24).toString(); // assume base 16px
                    } else { // assume px
                        newStyles.sz = Math.round(val * 1.5).toString();
                    }
                }
            }
            if (node.style.textAlign) {
                pProps.jc = node.style.textAlign;
                if (pProps.jc === 'justify') pProps.jc = 'both'; 
            } else if (node.getAttribute('align')) {
                pProps.jc = node.getAttribute('align');
                if (pProps.jc === 'justify') pProps.jc = 'both';
            }
            
            // When iterating children of a list, pass their index. Only index 'li' children for numbering.
            let childIdx = 1;
            let inner = Array.from(node.childNodes).map(child => {
                const isLi = child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'li';
                const passIdx = isLi ? childIdx++ : 0;
                return traverse(child, newStyles, passIdx);
            }).join('');
            
            let pPrInner = '';
            // heading styles?
            let styleVal = '';
            if (tag === 'h1') styleVal = 'Heading1';
            else if (tag === 'h2') styleVal = 'Heading2';
            else if (tag === 'h3') styleVal = 'Heading3';
            else if (tag === 'li') styleVal = 'ListParagraph';

            if (styleVal) pPrInner += `<w:pStyle w:val="${styleVal}"/>`;
            if (pProps.jc) pPrInner += `<w:jc w:val="${pProps.jc}"/>`;

            const pPrBlock = pPrInner ? `<w:pPr>${pPrInner}</w:pPr>` : '';

            switch (tag) {
                case 'p': case 'div': case 'h1': case 'h2': case 'h3':
                    return `<w:p>${pPrBlock}${inner}</w:p>`;
                case 'li':
                    const bullet = node.parentNode && node.parentNode.tagName.toLowerCase() === 'ol' 
                        ? `${listIdx || '1'}. ` 
                        : '• ';
                    return `<w:p>${pPrBlock}<w:r><w:t xml:space="preserve">${bullet}</w:t></w:r>${inner}</w:p>`;
                case 'br': return `<w:r><w:br/></w:r>`;
                case 'img': return `<w:r><w:t xml:space="preserve">[Image]</w:t></w:r>`;
                case 'hr': return `<w:p><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="auto"/></w:pBdr></w:p>`;
                case 'b': case 'strong': case 'i': case 'em': case 'u': case 'font': case 'span': return inner;
                // ul and ol just wrap content, which will be 'li'.
                case 'ul': case 'ol': return inner;
                default: return inner;
            }
        }

        let result = '';
        Array.from(temp.childNodes).forEach(child => {
            let out = traverse(child, {});
            if (out) {
                if (out.startsWith('<w:p>')) {
                    result += out;
                } else {
                    result += `<w:p>${out}</w:p>`;
                }
            }
        });
        return result;
    }

    btnPrint.addEventListener('click', () => {
        window.print();
    });

    const newDocModal = document.getElementById('new-doc-modal');
    const btnModalCancel = document.getElementById('btn-modal-cancel');
    const btnModalConfirm = document.getElementById('btn-modal-confirm');

    btnNewDoc.addEventListener('click', () => {
        newDocModal.classList.remove('hidden');
    });

    btnOpenDoc.addEventListener('click', () => {
        if (editor.innerText.trim().length > 0 && !confirm("Opening a document will replace your current content. Continue?")) {
            return;
        }
        fileOpenInput.value = '';
        fileOpenInput.click();
    });

    fileOpenInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        let title = file.name.replace(/\.[^/.]+$/, ""); // fallback title

        const processContent = (newHtml) => {
            editor.innerHTML = `<div class="editor-page" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Document Content">${newHtml}</div>`;
            docTitle.innerText = title;
            document.title = `${title} - GreenMeans: Docs`;
            initPages();
            updateWordCount();
            triggerAutosave();
            saveHistoryState();
            if (headerMenuContent) headerMenuContent.classList.remove('active');
            if (menuToggleBtn) menuToggleBtn.setAttribute('aria-expanded', 'false');
        };

        if (file.name.endsWith('.docx')) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const arrayBuffer = evt.target.result;
                if (window.mammoth) {
                    mammoth.convertToHtml({arrayBuffer: arrayBuffer})
                        .then(function(result){
                            processContent(result.value);
                        })
                        .catch(function(err){
                            alert("Error parsing .docx file.");
                        });
                } else {
                    alert("DOCX parser not loaded.");
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const content = evt.target.result;
                let newHtml = '';
                if (file.name.endsWith('.html')) {
                    const parser = new DOMParser();
                    const tempDoc = parser.parseFromString(content, 'text/html');
                    const titleTag = tempDoc.querySelector('title');
                    if (titleTag && titleTag.innerText) {
                        const parsedTitle = titleTag.innerText.replace(' - GreenMeans: Docs', '').trim();
                        if (parsedTitle) title = parsedTitle;
                    }
                    const h1 = tempDoc.body.querySelector('h1');
                    if (h1 && h1.innerText === title) {
                        h1.remove(); // remove the exported title header
                    }
                    newHtml = tempDoc.body.innerHTML;
                } else if (file.name.endsWith('.rtf')) {
                    // Crude fallback for RTF text extraction
                    let text = content.replace(/\\[a-z]+[0-9]* ?/gi, '')
                                      .replace(/[{}]/g, '')
                                      .trim();
                    const escaped = escapeXml(text);
                    newHtml = escaped.split('\n').map(p => `<p>${p || '<br>'}</p>`).join('');
                } else if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
                    const escaped = escapeXml(content);
                    newHtml = escaped.split('\n').map(p => `<p>${p || '<br>'}</p>`).join('');
                } else {
                    alert("Unsupported file format. Please upload .html, .txt, .md, .rtf, or .docx");
                    return;
                }
                processContent(newHtml || "<p><br></p>");
            };
            reader.readAsText(file);
        }
    });

    btnModalCancel.addEventListener('click', () => {
        newDocModal.classList.add('hidden');
    });

    btnModalConfirm.addEventListener('click', () => {
        editor.innerHTML = '<div class="editor-page" contenteditable="true" role="textbox" aria-multiline="true"><p><br></p></div>';
        docTitle.innerText = '';
        document.title = 'Untitled Document - GreenMeans: Docs';
        localStorage.removeItem('greenmeans_doc');
        saveStatus.innerText = "All changes saved";
        updateWordCount();
        initPages();
        
        // Reset and clear history
        historyStack = [];
        historyIndex = -1;
        localStorage.removeItem('greenmeans_history_stack');
        localStorage.removeItem('greenmeans_history_index');
        saveHistoryState();
        
        newDocModal.classList.add('hidden');
    });

    // === SETTINGS MODAL LOGIC ===
    const btnSettings = document.getElementById('btn-settings');
    const settingsModal = document.getElementById('settings-modal');
    const btnSettingsClose = document.getElementById('btn-settings-close');
    const btnCloseSettingsX = document.getElementById('btn-close-settings-x');
    const themeInputs = document.querySelectorAll('.theme-slider-input');
    const reduceMotionToggle = document.getElementById('reduce-motion-toggle');

    // Load settings from localStorage
    const savedTheme = localStorage.getItem('greenmeans_theme') || 'dark';
    const savedReduceMotion = localStorage.getItem('greenmeans_reduce_motion') === 'true';

    document.documentElement.setAttribute('data-theme', savedTheme);
    themeInputs.forEach(input => {
        if (input.value === savedTheme) {
            input.checked = true;
        }
        input.addEventListener('change', (e) => {
            if (e.target.checked) {
                const theme = e.target.value;
                document.documentElement.setAttribute('data-theme', theme);
                localStorage.setItem('greenmeans_theme', theme);
            }
        });
    });

    if (savedReduceMotion) {
        document.documentElement.setAttribute('data-reduce-motion', 'true');
        reduceMotionToggle.checked = true;
    }

    if (btnSettings && settingsModal && btnSettingsClose) {
        btnSettings.addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
            btnSettings.setAttribute('aria-expanded', 'true');
        });

        btnSettingsClose.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
            btnSettings.setAttribute('aria-expanded', 'false');
        });
        if (btnCloseSettingsX) {
            btnCloseSettingsX.addEventListener('click', () => {
                settingsModal.classList.add('hidden');
                btnSettings.setAttribute('aria-expanded', 'false');
            });
        }
    }

    if (reduceMotionToggle) {
        reduceMotionToggle.addEventListener('change', (e) => {
            const isReduced = e.target.checked;
            if (isReduced) {
                document.documentElement.setAttribute('data-reduce-motion', 'true');
            } else {
                document.documentElement.removeAttribute('data-reduce-motion');
            }
            localStorage.setItem('greenmeans_reduce_motion', isReduced);
        });
    }

    // === STATUS BAR TOGGLE ===
    const btnHideStatusBar = document.getElementById('toggle-status-bar');
    const btnShowStatusBar = document.getElementById('show-status-bar');
    const appBar = document.getElementById('app-status-bar');

    if (btnHideStatusBar && btnShowStatusBar && appBar) {
        btnHideStatusBar.addEventListener('click', () => {
            appBar.style.display = 'none';
            btnShowStatusBar.style.display = 'flex';
        });
        btnShowStatusBar.addEventListener('click', () => {
            appBar.style.display = 'flex';
            btnShowStatusBar.style.display = 'none';
        });
    }

    // === HINTS SIDEBAR LOGIC ===
    const btnHints = document.getElementById('btn-hints');
    const hintsSidebar = document.getElementById('hints-sidebar');
    const btnCloseHints = document.getElementById('btn-close-hints');

    if (btnHints && hintsSidebar && btnCloseHints) {
        btnHints.addEventListener('click', () => {
            const isExpanded = hintsSidebar.getAttribute('aria-expanded') === 'true';
            const nextState = !isExpanded;
            
            hintsSidebar.setAttribute('aria-expanded', nextState);
            
            if (nextState) {
                // Blur active element to dismiss keyboard on mobile
                if (document.activeElement && document.activeElement !== document.body) {
                    document.activeElement.blur();
                }
                // Focus sidebar for accessibility and to ensure keyboard is dismissed
                setTimeout(() => {
                    hintsSidebar.focus();
                }, 100);
            }
        });

        btnCloseHints.addEventListener('click', () => {
            hintsSidebar.setAttribute('aria-expanded', 'false');
        });
    }

    // === MULTI-PAGE LOGIC ===
    function preserveSelection(action) {
        const sel = window.getSelection();
        if (!sel.rangeCount) return action();
        
        let range = sel.getRangeAt(0);
        const markerId = 'selection-marker-' + Date.now();
        const marker = document.createElement('span');
        marker.id = markerId;
        
        // Sometimes the range can't insert a node (e.g. inside an input). Catch and ignore.
        try {
            range.insertNode(marker);
        } catch (e) {
            return action();
        }
        
        action();
        
        // Find marker and restore
        const restoredMarker = document.getElementById(markerId);
        if (restoredMarker) {
            const newRange = document.createRange();
            newRange.setStartBefore(restoredMarker);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
            restoredMarker.remove();
        }
    }

    function pageKeydownHandler(e) {
        if (e.key === 'Backspace' || e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            const sel = window.getSelection();
            if (sel.isCollapsed) {
                const range = sel.getRangeAt(0);
                const startRange = document.createRange();
                startRange.selectNodeContents(this);
                startRange.collapse(true);

                if (range.compareBoundaryPoints(Range.START_TO_START, startRange) === 0) {
                    const prev = this.previousElementSibling;
                    if (prev && prev.classList.contains('editor-page')) {
                        if (e.key === 'Backspace') {
                             e.preventDefault();
                             prev.focus();
                             const newRange = document.createRange();
                             newRange.selectNodeContents(prev);
                             newRange.collapse(false);
                             sel.removeAllRanges();
                             sel.addRange(newRange);
                        } else {
                            // Arrow keys: just focus previous without preventDefault so it might jump to the end naturally 
                            // though sometimes standard arrows don't jump across divs well
                            // we'll keep the preventDefault for now to be safe and manual
                            e.preventDefault();
                             prev.focus();
                             const newRange = document.createRange();
                             newRange.selectNodeContents(prev);
                             newRange.collapse(false);
                             sel.removeAllRanges();
                             sel.addRange(newRange);
                        }
                    }
                }
            }
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            const sel = window.getSelection();
            if (sel.isCollapsed) {
                const range = sel.getRangeAt(0).cloneRange();
                range.selectNodeContents(this);
                range.setStart(sel.anchorNode, sel.anchorOffset);
                if (range.toString().length === 0) {
                    e.preventDefault();
                    const next = this.nextElementSibling;
                    if (next && next.classList.contains('editor-page')) {
                        next.focus();
                        const newRange = document.createRange();
                        newRange.selectNodeContents(next);
                        newRange.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(newRange);
                    }
                }
            }
        }
    }

    function createNewPage() {
        const newPage = document.createElement('div');
        newPage.className = 'editor-page';
        newPage.setAttribute('contenteditable', 'true');
        newPage.setAttribute('role', 'textbox');
        newPage.setAttribute('aria-multiline', 'true');
        newPage.innerHTML = '<p><br></p>';
        docWrapper.appendChild(newPage);
        newPage.addEventListener('keydown', pageKeydownHandler);
        return newPage;
    }

    function checkPages() {
        preserveSelection(() => {
            let pages = Array.from(docWrapper.querySelectorAll('.editor-page'));
            if (pages.length === 0) {
                pages.push(createNewPage());
            }
            
            let i = 0;
            while (i < pages.length) {
                let page = pages[i];
                
                // Allow scrolling height calculation without padding
                let computed = window.getComputedStyle(page);
                let pTop = parseFloat(computed.paddingTop) || 0;
                let pBot = parseFloat(computed.paddingBottom) || 0;
                
                // Keep pushing as long as there's overflow AND more than one child
                while (page.scrollHeight > page.clientHeight && page.childNodes.length > 1) {
                    let next = pages[i + 1];
                    if (!next) {
                        next = createNewPage();
                        next.innerHTML = '';
                        pages.push(next);
                    } else if (next.innerHTML === '<p><br></p>') {
                        next.innerHTML = '';
                    }
                    
                    let last = page.lastChild;
                    next.insertBefore(last, next.firstChild);
                }
                
                // Pull content up
                while (page.scrollHeight <= page.clientHeight && pages[i + 1] && pages[i + 1].firstChild) {
                    let next = pages[i + 1];
                    let first = next.firstChild;
                    page.appendChild(first);
                    if (page.scrollHeight > page.clientHeight) {
                        next.insertBefore(first, next.firstChild);
                        break;
                    }
                }
                
                if (pages[i + 1]) {
                    if (pages[i + 1].innerHTML.trim() === '' || pages[i+1].innerHTML === '<p><br></p>' || pages[i+1].innerHTML === '<br>') {
                        pages[i + 1].remove();
                        pages.splice(i + 1, 1);
                    }
                }
                
                i++;
            }
        });
    }

    function initPages() {
        docWrapper.querySelectorAll('.editor-page').forEach(p => {
            p.addEventListener('keydown', pageKeydownHandler);
        });
        checkPages();
    }

    // === UNDO/REDO HISTORY MANAGER ===
    let historyStack = [];
    let historyIndex = -1;
    const MAX_HISTORY = 100;
    let isApplyingHistory = false;
    let historyDebounceTimeout = null;

    function captureSelectionMarker() {
        const sel = window.getSelection();
        if (!sel.rangeCount) return null;
        
        const range = sel.getRangeAt(0);
        const marker = document.createElement('span');
        marker.className = 'history-caret-marker';
        marker.style.display = 'none';
        
        try {
            range.insertNode(marker);
            return marker;
        } catch (e) {
            return null;
        }
    }

    function removeSelectionMarker(marker) {
        if (marker && marker.parentNode) {
            marker.remove();
        }
    }

    function saveHistoryState() {
        if (isApplyingHistory) return;
        
        const marker = captureSelectionMarker();
        const html = editor.innerHTML;
        removeSelectionMarker(marker);
        
        const sanitizedHtml = html.replace(/<span class="history-caret-marker"[^>]*><\/span>/g, '');
        
        if (historyIndex >= 0 && historyIndex < historyStack.length) {
            const lastState = historyStack[historyIndex];
            const lastSanitized = lastState.html.replace(/<span class="history-caret-marker"[^>]*><\/span>/g, '');
            if (lastSanitized === sanitizedHtml) {
                return;
            }
        }
        
        // Discard any forward redo history if we are inserting a new state
        if (historyIndex < historyStack.length - 1) {
            historyStack = historyStack.slice(0, historyIndex + 1);
        }
        
        historyStack.push({ html });
        if (historyStack.length > MAX_HISTORY) {
            historyStack.shift();
        }
        historyIndex = historyStack.length - 1;
        
        saveHistoryToLocalStorage();
    }

    function saveHistoryStateDebounced() {
        if (historyDebounceTimeout) clearTimeout(historyDebounceTimeout);
        historyDebounceTimeout = setTimeout(() => {
            saveHistoryState();
        }, 500);
    }

    function restoreHistoryState(state) {
        if (!state) return;
        isApplyingHistory = true;
        
        editor.innerHTML = state.html;
        
        const marker = editor.querySelector('.history-caret-marker');
        if (marker) {
            const sel = window.getSelection();
            const range = document.createRange();
            range.setStartBefore(marker);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            
            let parentPage = marker.closest('.editor-page');
            if (parentPage) {
                parentPage.focus();
            }
            marker.remove();
        } else {
            const page = editor.querySelector('.editor-page');
            if (page) page.focus();
        }
        
        initPages();
        updateWordCount();
        triggerAutosave();
        
        isApplyingHistory = false;
    }

    function saveHistoryToLocalStorage() {
        try {
            localStorage.setItem('greenmeans_history_stack', JSON.stringify(historyStack));
            localStorage.setItem('greenmeans_history_index', historyIndex.toString());
        } catch (e) {
            console.error("Unable to save history stack to localStorage", e);
        }
    }

    function loadHistoryFromLocalStorage() {
        try {
            const savedStack = localStorage.getItem('greenmeans_history_stack');
            const savedIndex = localStorage.getItem('greenmeans_history_index');
            if (savedStack && savedIndex !== null) {
                historyStack = JSON.parse(savedStack);
                historyIndex = parseInt(savedIndex, 10);
                return true;
            }
        } catch (e) {
            console.error("Unable to load history stack from localStorage", e);
        }
        return false;
    }

    function performUndo() {
        if (historyIndex > 0) {
            // Check if current HTML is unsaved to history, save it first so we can redo back to it
            const marker = captureSelectionMarker();
            const currentHtml = editor.innerHTML;
            removeSelectionMarker(marker);
            const sanitizedCurrent = currentHtml.replace(/<span class="history-caret-marker"[^>]*><\/span>/g, '');
            
            const lastState = historyStack[historyIndex];
            const lastSanitized = lastState.html.replace(/<span class="history-caret-marker"[^>]*><\/span>/g, '');
            
            if (lastSanitized !== sanitizedCurrent) {
                saveHistoryState();
            }
            
            if (historyIndex > 0) {
                historyIndex--;
                const state = historyStack[historyIndex];
                restoreHistoryState(state);
                saveHistoryToLocalStorage();
            }
        }
    }

    function performRedo() {
        if (historyIndex < historyStack.length - 1) {
            historyIndex++;
            const state = historyStack[historyIndex];
            restoreHistoryState(state);
            saveHistoryToLocalStorage();
        }
    }

    // === CUT LINE LOGIC ===
    function cutCurrentLine() {
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        
        let node = sel.getRangeAt(0).commonAncestorContainer;
        if (node.nodeType !== 1) {
            node = node.parentNode;
        }
        
        const block = node.closest('p, li, h1, h2, h3, tr, pre, img, table, hr, blockquote');
        if (!block) return;
        if (!block.closest('.editor-page')) return;
        
        const lineText = block.innerText || block.textContent || "";
        const lineHtml = block.outerHTML;
        
        saveHistoryState();
        
        try {
            if (navigator.clipboard && navigator.clipboard.write) {
                const textBlob = new Blob([lineText], { type: 'text/plain' });
                const htmlBlob = new Blob([lineHtml], { type: 'text/html' });
                const data = [new ClipboardItem({
                    'text/plain': textBlob,
                    'text/html': htmlBlob
                })];
                navigator.clipboard.write(data).catch(err => {
                    navigator.clipboard.writeText(lineText);
                });
            } else {
                navigator.clipboard.writeText(lineText);
            }
        } catch (e) {
            console.error('Clipboard write error:', e);
        }
        
        const tagName = block.tagName ? block.tagName.toLowerCase() : '';
        if (tagName === 'img') {
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            if (block.parentNode) {
                block.parentNode.replaceChild(p, block);
            }
            const range = document.createRange();
            range.selectNodeContents(p);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            p.focus();
        } else if (tagName === 'table' || tagName === 'tr') {
            Array.from(block.querySelectorAll('td, th')).forEach(cell => {
                cell.innerHTML = '<br>';
            });
            const firstCell = block.querySelector('td, th');
            if (firstCell) {
                const range = document.createRange();
                range.selectNodeContents(firstCell);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                firstCell.focus();
            }
        } else {
            block.innerHTML = '<br>';
            const range = document.createRange();
            range.selectNodeContents(block);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            if (block.focus) block.focus();
        }
        
        checkPages();
        triggerAutosave();
        updateWordCountDebounced();
        saveHistoryStateDebounced();
    }

    // === AUTOSAVE ===
    let autosaveTimeout;

    docTitle.addEventListener('input', triggerAutosave);
    
    // Delegation for keydown to capture boundary snapshots before change
    let lastKeydownAction = 0;
    docWrapper.addEventListener('keydown', (e) => {
        if (e.target.classList.contains('editor-page')) {
            if (e.key === ' ' || e.key === 'Enter' || e.key === 'Backspace' || e.key === 'Delete') {
                // Throttle history saving for repeated keys (holding down backspace)
                const now = Date.now();
                if (now - lastKeydownAction > 500) {
                    saveHistoryState();
                    lastKeydownAction = now;
                }
            }
        }
    });

    // Delegation for input
    docWrapper.addEventListener('input', (e) => {
        if (e.target.classList.contains('editor-page')) {
            checkPages();
            triggerAutosave();
            updateWordCountDebounced();
            saveHistoryStateDebounced();
        }
    });

    // Cleanup empty states
    docWrapper.addEventListener('blur', (e) => {
        if (e.target.classList.contains('editor-page')) {
            const h = e.target.innerHTML.trim();
            if (h === '<br>' || h === '<p><br></p>' || h === '<div><br></div>' || !e.target.textContent.trim() && !e.target.querySelector('img, table, hr')) {
                // If it's the only page, keep placeholder structure
                if (docWrapper.querySelectorAll('.editor-page').length === 1) {
                    e.target.innerHTML = '';
                }
            }
        }
    }, true);

    docTitle.addEventListener('focus', () => {
        if (docTitle.innerText.trim() === 'Untitled Document') {
            docTitle.innerText = '';
        }
    });

    docTitle.addEventListener('blur', () => {
        if (!docTitle.textContent.trim()) {
            docTitle.innerHTML = '';
        }
    });

    function triggerAutosave() {
        saveStatus.innerText = "Saving...";
        clearTimeout(autosaveTimeout);
        autosaveTimeout = setTimeout(saveToLocalStorage, 1000);
        
        if(document.activeElement === docTitle) {
            const titleText = docTitle.innerText.trim();
            document.title = `${titleText || 'Untitled Document'} - GreenMeans: Docs`;
        }
    }

    function saveToLocalStorage() {
        clearFindHighlights();
        const data = {
            title: docTitle.innerText.trim(),
            content: editor.innerHTML,
            lastSaved: Date.now()
        };
        localStorage.setItem('greenmeans_doc', JSON.stringify(data));
        saveStatus.innerHTML = '<span style="color:var(--color-primary); font-size:14px; margin-right:4px;">●</span>All changes saved';
    }

    // === WORD COUNT ===
    let wpTimeout;
    function updateWordCountDebounced() {
        clearTimeout(wpTimeout);
        wpTimeout = setTimeout(updateWordCount, 150);
    }

    function updateWordCount() {
        const text = editor.innerText.trim();
        const noSpaceText = text.replace(/\s+/g, '');
        
        const chars = text.length;
        const noSpaceChars = noSpaceText.length;
        const words = text ? text.split(/\s+/).length : 0;
        
        const pCount = editor.querySelectorAll('p, h1, h2, h3, li').length || (text ? 1 : 0);
        const readMins = Math.max(1, Math.ceil(words / 200));

        wordCountEl.innerText = `Words: ${words}`;
        charCountEl.innerText = `Characters: ${chars}`;
        charNoSpaceEl.innerText = `Characters (no spaces): ${noSpaceChars}`;
        paraCountEl.innerText = `Paragraphs: ${pCount}`;
        readTimeEl.innerText = `Reading time: ~${readMins} min`;
    }

    // === KEYBOARD SHORTCUTS ===
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    saveHistoryState();
                    document.execCommand('bold');
                    updateToolbarState();
                    saveHistoryStateDebounced();
                    break;
                case 'i':
                    e.preventDefault();
                    saveHistoryState();
                    document.execCommand('italic');
                    updateToolbarState();
                    saveHistoryStateDebounced();
                    break;
                case 'u':
                    e.preventDefault();
                    saveHistoryState();
                    document.execCommand('underline');
                    updateToolbarState();
                    saveHistoryStateDebounced();
                    break;
                case 'f':
                case 'h':
                    e.preventDefault();
                    frBtn.click();
                    break;
                case 'p':
                    e.preventDefault();
                    btnPrint.click();
                    break;
                case 's':
                    e.preventDefault();
                    triggerAutosave();
                    saveToLocalStorage();
                    document.querySelector('[data-export="html"]').click();
                    break;
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) {
                        performRedo();
                    } else {
                        performUndo();
                    }
                    updateToolbarState();
                    break;
                case 'y':
                    e.preventDefault();
                    performRedo();
                    updateToolbarState();
                    break;
                case 'k':
                    e.preventDefault();
                    if (linkBtn) linkBtn.click();
                    break;
                case 'x':
                    const sel = window.getSelection();
                    if (sel.isCollapsed) {
                        e.preventDefault();
                        performRedo();
                        updateToolbarState();
                    }
                    break;
                case 'k':
                    e.preventDefault();
                    cutCurrentLine();
                    break;
            }
        }
        
        if (e.key === 'Escape') {
            frPanel.classList.add('hidden');
            htmlPanel.classList.add('hidden');
            clearFindHighlights();
            tablePicker.classList.add('hidden');
            saveDropdown.classList.add('hidden');
        }
    });

    // === STANDALONE UNCOMPRESSED ZIP CREATOR (FOSS, SELF-CONTAINED) ===
    function createStoreZip(files) {
        const crcTable = [];
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) {
                c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
            }
            crcTable[i] = c;
        }
        function calcCrc32(data) {
            let crc = 0 ^ -1;
            for (let i = 0; i < data.length; i++) {
                crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xFF];
            }
            return (crc ^ -1) >>> 0;
        }

        const textEncoder = new TextEncoder();
        function strToU8(str) {
            return textEncoder.encode(str);
        }

        let offset = 0;
        const fileEntries = [];
        const chunks = [];

        function writeUint16(val) {
            const arr = new Uint8Array(2);
            arr[0] = val & 0xFF;
            arr[1] = (val >> 8) & 0xFF;
            return arr;
        }
        function writeUint32(val) {
            const arr = new Uint8Array(4);
            arr[0] = val & 0xFF;
            arr[1] = (val >> 8) & 0xFF;
            arr[2] = (val >> 16) & 0xFF;
            arr[3] = (val >> 24) & 0xFF;
            return arr;
        }

        const keys = Object.keys(files);
        for (const name of keys) {
            let data = files[name];
            if (typeof data === 'string') {
                data = strToU8(data);
            }
            const nameBytes = strToU8(name);
            const crc = calcCrc32(data);
            const date = 0x3a21; // 2009-01-01
            const time = 0x0000;

            const lfhSig = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
            const versionNeeded = writeUint16(10);
            const flags = writeUint16(0);
            const compMethod = writeUint16(0); // STORE
            const modTime = writeUint16(time);
            const modDate = writeUint16(date);
            const crcBytes = writeUint32(crc);
            const sizeBytes = writeUint32(data.length);
            const nameLen = writeUint16(nameBytes.length);
            const extraLen = writeUint16(0);

            const lfhHeaderPart = new Uint8Array(30);
            lfhHeaderPart.set(lfhSig, 0);
            lfhHeaderPart.set(versionNeeded, 4);
            lfhHeaderPart.set(flags, 6);
            lfhHeaderPart.set(compMethod, 8);
            lfhHeaderPart.set(modTime, 10);
            lfhHeaderPart.set(modDate, 12);
            lfhHeaderPart.set(crcBytes, 14);
            lfhHeaderPart.set(sizeBytes, 18); // compressed size
            lfhHeaderPart.set(sizeBytes, 22); // uncompressed size
            lfhHeaderPart.set(nameLen, 26);
            lfhHeaderPart.set(extraLen, 28);

            chunks.push(lfhHeaderPart);
            chunks.push(nameBytes);
            chunks.push(data);

            fileEntries.push({
                nameBytes,
                crc,
                length: data.length,
                time,
                date,
                offset: offset
            });

            offset += lfhHeaderPart.length + nameBytes.length + data.length;
        }

        const cdhOffset = offset;
        let cdhSize = 0;

        for (const ent of fileEntries) {
            const cdhSig = new Uint8Array([0x50, 0x4b, 0x01, 0x02]);
            const rVersionMadeBy = writeUint16(10);
            const rVersionNeeded = writeUint16(10);
            const rFlags = writeUint16(0);
            const rCompMethod = writeUint16(0);
            const rModTime = writeUint16(ent.time);
            const rModDate = writeUint16(ent.date);
            const rCrcBytes = writeUint32(ent.crc);
            const rSizeBytes = writeUint32(ent.length);
            const rNameLen = writeUint16(ent.nameBytes.length);
            const rExtraLen = writeUint16(0);
            const rCommentLen = writeUint16(0);
            const rDiskStart = writeUint16(0);
            const rIntAttr = writeUint16(0);
            const rExtAttr = writeUint32(0);
            const rLocalOffset = writeUint32(ent.offset);

            const cdhHeader = new Uint8Array(46);
            cdhHeader.set(cdhSig, 0);
            cdhHeader.set(rVersionMadeBy, 4);
            cdhHeader.set(rVersionNeeded, 6);
            cdhHeader.set(rFlags, 8);
            cdhHeader.set(rCompMethod, 10);
            cdhHeader.set(rModTime, 12);
            cdhHeader.set(rModDate, 14);
            cdhHeader.set(rCrcBytes, 16);
            cdhHeader.set(rSizeBytes, 20); // compressed size
            cdhHeader.set(rSizeBytes, 24); // uncompressed size
            cdhHeader.set(rNameLen, 28);
            cdhHeader.set(rExtraLen, 30);
            cdhHeader.set(rCommentLen, 32);
            cdhHeader.set(rDiskStart, 34);
            cdhHeader.set(rIntAttr, 36);
            cdhHeader.set(rExtAttr, 38);
            cdhHeader.set(rLocalOffset, 42);

            chunks.push(cdhHeader);
            chunks.push(ent.nameBytes);

            cdhSize += cdhHeader.length + ent.nameBytes.length;
        }

        const eocdSig = new Uint8Array([0x50, 0x4b, 0x05, 0x06]);
        const diskNum = writeUint16(0);
        const diskStart = writeUint16(0);
        const numRecordsOnDisk = writeUint16(keys.length);
        const totalRecords = writeUint16(keys.length);
        const sizeOfCentralDir = writeUint32(cdhSize);
        const offsetOfCentralDir = writeUint32(cdhOffset);
        const commentLen = writeUint16(0);

        const eocd = new Uint8Array(22);
        eocd.set(eocdSig, 0);
        eocd.set(diskNum, 4);
        eocd.set(diskStart, 6);
        eocd.set(numRecordsOnDisk, 8);
        eocd.set(totalRecords, 10);
        eocd.set(sizeOfCentralDir, 12);
        eocd.set(offsetOfCentralDir, 16);
        eocd.set(commentLen, 20);

        chunks.push(eocd);

        let totalLen = 0;
        for (const ch of chunks) {
            totalLen += ch.length;
        }

        const result = new Uint8Array(totalLen);
        let curPos = 0;
        for (const ch of chunks) {
            result.set(ch, curPos);
            curPos += ch.length;
        }

        return result;
    }

    // Boot
    init();

})();

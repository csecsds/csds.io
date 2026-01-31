// manage-subjects.js
// Allows adding and removing subject HTML pages (requires File System Access API for automatic file ops).

(function () {
    function sanitizeFileName(name) {
        return name.trim().toLowerCase().replace(/[^a-z0-9\- ]+/g, '').replace(/\s+/g, '-');
    }

    function createTemplate(title) {
        const safeTitle = title.replace(/"/g, '&quot;');
        return `<!DOCTYPE html>
<html>
<head>
    <title>${safeTitle}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .controls { margin-bottom: 20px; }
        .download-btn { display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; cursor: pointer; font-size: 16px; border: none; }
        .remove-pdf-btn { margin-left: 8px; background:#e53935;color:#fff;border:none;padding:6px 8px;border-radius:4px;cursor:pointer }
    </style>
</head>
<body>
    <div class="container">
        <h2>${safeTitle} Question Bank</h2>
        <div class="controls">
            <button id="add-pdf-btn" class="download-btn">➕ Add PDF</button>
            <div id="pdf-links" style="margin-top:10px"></div>
        </div>

        <iframe id="pdf-viewer" src="pdfs/${sanitizeFileName(title)}.pdf" type="application/pdf" style="width:100%;height:600px;border:1px solid #ddd;border-radius:4px"></iframe>

        <br><br>
        <a href="index.html" class="back-link">← Back to All Subjects</a>
    </div>
    <script src="add-pdf.js"></script>
    <script src="manage-subjects.js"></script>
</body>
</html>`;
    }

    async function addSubjectFlow() {
        const title = prompt('Enter subject name (e.g. "Machine Learning"):');
        if (!title) return;
        let filename = sanitizeFileName(title);
        if (!filename) { alert('Invalid name'); return; }
        filename = filename + '.html';

        const template = createTemplate(title);

        if (!window.showDirectoryPicker) {
            const snippet = `Create a file named ${filename} in your site folder with this content:\n\n${template}`;
            alert('Automatic file creation is not supported in this browser.\n' + snippet);
            // Also add to current page DOM so you can see it immediately
            addSubjectToDOM(title, filename);
            return;
        }

        try {
            const dirHandle = await window.showDirectoryPicker();
            // Create or confirm
            let exists = false;
            try {
                await dirHandle.getFileHandle(filename);
                exists = true;
            } catch (e) {
                exists = false;
            }
            if (exists) {
                if (!confirm(filename + ' already exists. Overwrite?')) return;
            }
            const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(template);
            await writable.close();

            alert('Created ' + filename + '.');
            addSubjectToDOM(title, filename);
        } catch (err) {
            console.error(err);
            alert('Error creating file: ' + (err.message || err));
        }
    }

    function addSubjectToDOM(title, filename) {
        // Try to append to one of the known lists
        const mainList = document.getElementById('main-subjects-list') || document.getElementById('data-science-subjects') || document.getElementById('cyber-subjects');
        if (!mainList) return;
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = filename;
        a.textContent = title;
        li.appendChild(a);
        // Do not add remove button on the main home page list
        if (mainList.id !== 'main-subjects-list') {
            const btn = document.createElement('button');
            btn.className = 'remove-subject';
            btn.dataset.href = filename;
            btn.style = 'margin-left:10px;background:#e53935;color:#fff;border:none;padding:6px 8px;border-radius:4px;cursor:pointer';
            btn.textContent = '🗑️ Remove';
            li.appendChild(document.createTextNode(' '));
            li.appendChild(btn);
            btn.addEventListener('click', onRemoveSubjectButton);
        }
        mainList.appendChild(li);
    }

    async function onRemoveSubjectButton(e) {
        const btn = e.currentTarget;
        const href = btn.dataset.href;
        if (!href) return;
        if (!confirm('Delete subject file "' + href + '" from disk and remove link?')) return;

        if (!window.showDirectoryPicker) {
            // Remove from DOM only
            const li = btn.closest('li'); if (li && li.parentNode) li.parentNode.removeChild(li);
            alert('Automatic deletion is not supported in this browser. Please delete ' + href + ' manually.');
            return;
        }

        try {
            const dirHandle = await window.showDirectoryPicker();
            try {
                if (typeof dirHandle.removeEntry === 'function') {
                    await dirHandle.removeEntry(href);
                    // remove from DOM
                    const li = btn.closest('li'); if (li && li.parentNode) li.parentNode.removeChild(li);
                    alert('Deleted ' + href);
                } else {
                    alert('Your browser does not support programmatic deletion. Please delete ' + href + ' manually from the site folder.');
                }
            } catch (err) {
                console.error(err);
                alert('Error deleting file: ' + (err.message || err));
            }
        } catch (err) {
            console.error(err);
            alert('Error: ' + (err.message || err));
        }
    }

    function filterSubjects(query) {
        const q = (query || '').toLowerCase();
        const items = document.querySelectorAll('#main-subjects-list li, #data-science-subjects li, #cyber-subjects li');
        items.forEach(li => {
            const a = li.querySelector('a');
            const text = (a && a.textContent) || '';
            li.style.display = text.toLowerCase().includes(q) ? '' : 'none';
        });
    }

    async function fetchSubjects() {
        try {
            const res = await fetch('/api/subjects');
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            console.error('Failed to fetch subjects', e);
            return null;
        }
    }

    function renderSubjects(subjects, isAdmin) {
        // main
        const mainList = document.getElementById('main-subjects-list');
        if (mainList && subjects.main) {
            mainList.innerHTML = '';
            subjects.main.forEach(s => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = s.filename; a.textContent = s.title; li.appendChild(a);
                if (isAdmin) {
                    const btn = document.createElement('button');
                    btn.className = 'remove-subject'; btn.dataset.href = s.filename; btn.dataset.category = 'main';
                    btn.style = 'margin-left:10px;background:#e53935;color:#fff;border:none;padding:6px 8px;border-radius:4px;cursor:pointer';
                    btn.textContent = '🗑️ Remove';
                    btn.addEventListener('click', onRemoveSubjectButtonServer);
                    li.appendChild(btn);
                }
                mainList.appendChild(li);
            });
        }
        // data-science
        const dsList = document.getElementById('data-science-subjects');
        if (dsList && subjects['data-science']) {
            dsList.innerHTML = '';
            subjects['data-science'].forEach(s => {
                const li = document.createElement('li');
                const a = document.createElement('a'); a.href = s.filename; a.textContent = s.title; li.appendChild(a);
                if (isAdmin) {
                    const btn = document.createElement('button');
                    btn.className = 'remove-subject'; btn.dataset.href = s.filename; btn.dataset.category = 'data-science';
                    btn.style = 'margin-left:10px;background:#e53935;color:#fff;border:none;padding:6px 8px;border-radius:4px;cursor:pointer';
                    btn.textContent = '🗑️ Remove';
                    btn.addEventListener('click', onRemoveSubjectButtonServer);
                    li.appendChild(btn);
                }
                dsList.appendChild(li);
            });
        }
        // cyber
        const cyList = document.getElementById('cyber-subjects');
        if (cyList && subjects['cyber']) {
            cyList.innerHTML = '';
            subjects['cyber'].forEach(s => {
                const li = document.createElement('li');
                const a = document.createElement('a'); a.href = s.filename; a.textContent = s.title; li.appendChild(a);
                if (isAdmin) {
                    const btn = document.createElement('button');
                    btn.className = 'remove-subject'; btn.dataset.href = s.filename; btn.dataset.category = 'cyber';
                    btn.style = 'margin-left:10px;background:#e53935;color:#fff;border:none;padding:6px 8px;border-radius:4px;cursor:pointer';
                    btn.textContent = '🗑️ Remove';
                    btn.addEventListener('click', onRemoveSubjectButtonServer);
                    li.appendChild(btn);
                }
                cyList.appendChild(li);
            });
        }
    }

    async function onRemoveSubjectButtonServer(e) {
        const btn = e.currentTarget;
        const filename = btn.dataset.href;
        const category = btn.dataset.category;
        if (!confirm('Delete subject file "' + filename + '"?')) return;
        try {
            const res = await fetch('/api/subjects/delete', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename, category }) });
            if (!res.ok) {
                const j = await res.json(); alert('Error: ' + (j.error || res.statusText)); return;
            }
            const subs = await fetchSubjects(); if (subs) renderSubjects(subs, true);
        } catch (err) { console.error(err); alert('Delete failed'); }
    }

    function attachSubjectButtons() {
        const addBtns = document.querySelectorAll('#add-subject-btn');
        addBtns.forEach(b => b.addEventListener('click', function (e) { e.preventDefault(); addSubjectFlowServer(); }));

        // Wire up search input if present
        const search = document.getElementById('subject-search');
        if (search) {
            search.addEventListener('input', function (e) { filterSubjects(e.target.value); });
        }
    }

    async function addSubjectFlowServer() {
        const title = prompt('Enter subject name (e.g. "Machine Learning")');
        if (!title) return;
        // determine category based on page
        let category = 'main';
        if (document.getElementById('data-science-subjects')) category = 'data-science';
        if (document.getElementById('cyber-subjects')) category = 'cyber';
        try {
            const res = await fetch('/api/subjects/add', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, category }) });
            if (!res.ok) { const j = await res.json(); alert('Error: ' + (j.error || res.statusText)); return; }
            const j = await res.json();
            alert('Created ' + j.file);
            const subs = await fetchSubjects(); if (subs) {
                const isAdmin = true; renderSubjects(subs, isAdmin);
            }
        } catch (err) { console.error(err); alert('Create failed'); }
    }

    document.addEventListener('DOMContentLoaded', async function () {
        attachSubjectButtons();
        const s = await fetch('/api/session', { credentials: 'same-origin' });
        const isAdmin = s.ok ? (await s.json()).isAdmin : false;
        // show add button(s) only to admin
        document.querySelectorAll('#add-subject-btn').forEach(b => { b.style.display = isAdmin ? 'inline-block' : 'none'; });
        const subs = await fetchSubjects();
        if (subs) renderSubjects(subs, isAdmin);

        // socket listener
        try {
            const socket = io();
            socket.on('subjects-updated', function (subjects) { renderSubjects(subjects, isAdmin); });
        } catch (e) {
            console.warn('Socket not available', e.message);
        }

        const search = document.getElementById('subject-search');
        if (search) filterSubjects(search.value);
    });
})();

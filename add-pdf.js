// add-pdf.js
// Adds an "Add PDF" flow using the File System Access API (Chromium-based browsers).
// Fallback: shows an HTML snippet and updates page DOM (non-persistent).

(function () {
    function $(sel) { return document.querySelector(sel); }

    function escapeHtml(text) {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    async function copyFileToDir(fileHandle, targetDirHandle, name) {
        const file = await fileHandle.getFile();
        let fileName = name || file.name;
        // If file exists, add timestamp suffix
        try {
            await targetDirHandle.getFileHandle(fileName);
            const ts = Date.now();
            const dot = fileName.lastIndexOf('.');
            if (dot > 0) fileName = fileName.slice(0, dot) + '-' + ts + fileName.slice(dot);
            else fileName = fileName + '-' + ts;
        } catch (e) {
            // file does not exist, okay
        }
        const target = await targetDirHandle.getFileHandle(fileName, { create: true });
        const writable = await target.createWritable();
        const arrayBuffer = await file.arrayBuffer();
        await writable.write(arrayBuffer);
        await writable.close();
        return fileName;
    }

    async function removeFileFromDirByName(dirHandle, fileName) {
        try {
            // removeEntry may exist on directory handle
            if (typeof dirHandle.removeEntry === 'function') {
                await dirHandle.removeEntry(fileName);
                return true;
            }
            // Otherwise try to get file handle and then remove by creating a new empty file? can't; so return false
            return false;
        } catch (err) {
            console.error('removeFileFromDirByName error', err);
            return false;
        }
    }

    async function promptAndSave() {
        if (!window.showOpenFilePicker || !window.showDirectoryPicker) {
            // Fallback: non-persistent — ask user to pick a file via input and then show HTML snippet
            return fallbackAdd();
        }

        try {
            // Pick source file
            const [sourceHandle] = await window.showOpenFilePicker({
                multiple: false,
                types: [
                    { description: 'PDF or PPT', accept: { 'application/pdf': ['.pdf'], 'application/vnd.ms-powerpoint': ['.ppt'], 'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'] } }
                ]
            });

            // Ask user to pick the project directory or the pdfs folder
            const dirHandle = await window.showDirectoryPicker();

            // Ensure we have a 'pdfs' subdir (create if needed)
            let pdfDirHandle = null;
            try {
                pdfDirHandle = await dirHandle.getDirectoryHandle('pdfs');
            } catch (e) {
                // Not found, create
                pdfDirHandle = await dirHandle.getDirectoryHandle('pdfs', { create: true });
            }

            // Copy file into pdfs
            const savedFileName = await copyFileToDir(sourceHandle, pdfDirHandle);

            // Ask user which HTML file to update (pick the html page where link should be added)
            const [htmlHandle] = await window.showOpenFilePicker({
                multiple: false,
                types: [{ description: 'HTML file', accept: { 'text/html': ['.html'] } }]
            });

            // Read HTML content
            const htmlFile = await htmlHandle.getFile();
            let htmlText = await htmlFile.text();

            // Build anchor element
            const displayText = sourceHandle.name || savedFileName;
            const anchor = `<a href="pdfs/${encodeURI(savedFileName)}" download class="download-btn" style="margin-left:10px">⬇️ ${escapeHtml(displayText)}</a>`;

            // Try to insert into <div id="pdf-links"> if present
            if (htmlText.includes('id="pdf-links"')) {
                htmlText = htmlText.replace(/(\<div[^>]*id="pdf-links"[^>]*>)([\s\S]*?)(<\/div>)/i, function (m, open, inner, close) {
                    return open + '\n                ' + anchor + '\n            ' + inner + close;
                });
            } else if (htmlText.includes('class="controls"')) {
                // Insert before closing of the .controls div
                htmlText = htmlText.replace(/(\<div[^>]*class="controls"[^>]*>)([\s\S]*?)(<\/div>)/i, function (m, open, inner, close) {
                    return open + inner + '\n            ' + anchor + '\n            <div id="pdf-links" style="margin-top:10px"></div>' + close;
                });
            } else {
                // Fallback append near end of container
                htmlText = htmlText.replace(/(\<\/div>\s*<\/body>)/i, function (m) {
                    return '<div class="controls">' + anchor + '<div id="pdf-links" style="margin-top:10px"></div></div>\n    ' + m;
                });
            }

            // Write back modified HTML
            const writable = await htmlHandle.createWritable();
            await writable.write(htmlText);
            await writable.close();

            // Update current DOM if we're on the same page
            const currentPath = location.pathname.split('/').pop();
            const pickedHtmlName = (await htmlHandle.getFile()).name;
            if (currentPath === pickedHtmlName) {
                const pdfLinks = document.getElementById('pdf-links');
                if (pdfLinks) {
                    const a = document.createElement('a');
                    a.href = 'pdfs/' + savedFileName;
                    a.download = '';
                    a.className = 'download-btn';
                    a.style.marginLeft = '10px';
                    a.textContent = '⬇️ ' + displayText;
                    pdfLinks.appendChild(a);
                    attachRemoveButtonToAnchor(a, false, window.__isAdminForPdf);
                }
            }

            alert('Saved "' + savedFileName + '" to pdfs/ and updated ' + pickedHtmlName + '.');
        } catch (err) {
            console.error(err);
            alert('Error: ' + (err.message || err));
        }
    }

    async function removePdf(filename, anchorEl) {
        if (!confirm('Delete "' + filename + '" from the site and remove its link from the page/HTML?')) return;

        if (!window.showDirectoryPicker || !window.showOpenFilePicker) {
            // Fallback: cannot delete filesystem automatically
            if (anchorEl && anchorEl.parentNode) anchorEl.parentNode.removeChild(anchorEl);
            alert('Automatic deletion is not supported in this browser. Please remove the file from the site\'s pdfs/ folder manually, and remove the corresponding link from the HTML if you want to persist the change.');
            return;
        }

        try {
            // Pick the site/project directory
            const dirHandle = await window.showDirectoryPicker();
            let pdfDirHandle = null;
            try {
                pdfDirHandle = await dirHandle.getDirectoryHandle('pdfs');
            } catch (e) {
                alert('Could not find a pdfs/ folder inside the selected directory. Deletion cancelled.');
                return;
            }

            const deleted = await removeFileFromDirByName(pdfDirHandle, filename);
            if (!deleted) {
                alert('Could not delete file programmatically. You may not have permission or the browser does not support removing entries. Please delete the file manually.');
                // still remove DOM link
                if (anchorEl && anchorEl.parentNode) anchorEl.parentNode.removeChild(anchorEl);
            } else {
                // Remove link from current DOM
                if (anchorEl && anchorEl.parentNode) anchorEl.parentNode.removeChild(anchorEl);

                // Ask user to pick the HTML page(s) to update
                const [htmlHandle] = await window.showOpenFilePicker({
                    multiple: false,
                    types: [{ description: 'HTML file', accept: { 'text/html': ['.html'] } }]
                });

                const htmlFile = await htmlHandle.getFile();
                let htmlText = await htmlFile.text();
                const pattern = new RegExp('<a[^>]*href="pdfs/' + filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[\s\S]*?<\/a>', 'i');
                htmlText = htmlText.replace(pattern, '');

                const writable = await htmlHandle.createWritable();
                await writable.write(htmlText);
                await writable.close();

                alert('Deleted "' + filename + '" and removed its link from the selected HTML file.');
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting file: ' + (err.message || err));
        }
    }

    function fallbackAdd() {
        // Create file input dynamically
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.ppt,.pptx';
        input.onchange = function () {
            const file = input.files[0];
            const name = file.name;
            // Insert into DOM only and show HTML snippet to persist manually
            const pdfLinks = document.getElementById('pdf-links') || document.createElement('div');
            if (!document.getElementById('pdf-links')) {
                pdfLinks.id = 'pdf-links';
                pdfLinks.style.marginTop = '10px';
                const controls = document.querySelector('.controls') || document.querySelector('.container');
                controls.appendChild(pdfLinks);
            }
            const a = document.createElement('a');
            a.textContent = '⬇️ ' + name + ' (local)';
            a.className = 'download-btn';
            a.style.marginLeft = '10px';
            // create object URL
            const url = URL.createObjectURL(file);
            a.href = url;
            a.target = '_blank';
            pdfLinks.appendChild(a);
            attachRemoveButtonToAnchor(a, true);

            const snippet = `<!-- Add this link to the page HTML to persist -->\n<a href="pdfs/${name}" download class="download-btn">⬇️ ${escapeHtml(name)}</a>`;
            prompt('Automatic saving is not supported in this browser.\nWe added a temporary link to the page.\nTo persist the PDF, copy the file into the site\'s pdfs/ folder and add this HTML into your page:', snippet);
            attachRemoveButtonToAnchor(a, true, window.__isAdminForPdf);
        };
        input.click();
    }

    function attachRemoveButtonToAnchor(a, isTemporary, isAdmin) {
        if (!a || a.dataset.removeAttached) return;
        if (!isAdmin) return; // only attach UI to admins
        a.dataset.removeAttached = '1';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'remove-pdf-btn';
        btn.textContent = '🗑️ Remove';
        btn.style.marginLeft = '8px';
        btn.style.background = '#e53935';
        btn.style.color = '#fff';
        btn.style.border = 'none';
        btn.style.padding = '6px 8px';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const href = a.getAttribute('href') || '';
            const filename = href.split('/').pop();
            if (isTemporary) {
                if (confirm('Remove temporary link from this page?')) {
                    if (a.parentNode) a.parentNode.removeChild(a);
                    if (btn.parentNode) btn.parentNode.removeChild(btn);
                }
            } else {
                // server-side delete if admin
                if (confirm('Delete "' + filename + '" from server?')) {
                    fetch('/api/pdfs/delete', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename }) })
                        .then(r => r.json())
                        .then(j => {
                            if (j && j.success) {
                                if (a.parentNode) a.parentNode.removeChild(a);
                                if (btn.parentNode) btn.parentNode.removeChild(btn);
                                alert('Deleted ' + filename);
                            } else {
                                alert('Delete failed: ' + (j && j.error ? j.error : 'unknown'));
                            }
                        }).catch(err => { console.error(err); alert('Delete failed'); });
                }
            }
        });
        a.parentNode.insertBefore(btn, a.nextSibling);
    }

    function scanAndAttach(isAdmin) {
        // Attach remove buttons to existing anchors in controls and pdf-links only for admins
        const anchors = document.querySelectorAll('.controls a.download-btn, #pdf-links a.download-btn');
        anchors.forEach(a => attachRemoveButtonToAnchor(a, false, isAdmin));
    }

    document.addEventListener('DOMContentLoaded', async function () {
        // determine admin session so add/remove controls are admin-only
        let isAdmin = false;
        try {
            const s = await fetch('/api/session', { credentials: 'same-origin' });
            if (s.ok) {
                const j = await s.json(); isAdmin = !!j.isAdmin;
            }
        } catch (e) { /* ignore */ }
        // expose globally for other helpers in this file
        window.__isAdminForPdf = !!isAdmin;

        const btn = document.getElementById('add-pdf-btn');
        if (btn) {
            if (!isAdmin) {
                // hide add button for non-admin users
                btn.style.display = 'none';
            } else {
                btn.addEventListener('click', function (e) {
                    e.preventDefault();
                    // server upload flow: choose file and POST to /api/upload
                    const input = document.createElement('input');
                    input.type = 'file'; input.accept = '.pdf';
                    input.onchange = async function () {
                        const file = input.files[0]; if (!file) return;
                        // determine name to save as: if page has iframe pdf-viewer use its target name
                        let desiredName = '';
                        const iframe = document.getElementById('pdf-viewer');
                        if (iframe && iframe.src) {
                            try {
                                const u = new URL(iframe.src, location.href);
                                const parts = u.pathname.split('/'); desiredName = parts[parts.length-1];
                            } catch (e) { desiredName = ''; }
                        }
                        const fd = new FormData(); fd.append('file', file);
                        if (desiredName) fd.append('name', desiredName);
                        const res = await fetch('/api/upload', { method: 'POST', credentials: 'same-origin', body: fd });
                        if (!res.ok) { alert('Upload failed'); return; }
                        alert('Uploaded ' + file.name);
                        // refresh pdf-links via existing client script (socket will notify too)
                    };
                    input.click();
                });
            }
        }

        // Attach remove buttons only for admin
        scanAndAttach(isAdmin);
    });
})();

(function(){
  async function $(sel){ return document.querySelector(sel); }
  const socket = io();

  async function renderList(pdfs){
    const container = document.getElementById('pdf-list');
    container.innerHTML = '';
    pdfs.forEach(p=>{
      const div = document.createElement('div');
      div.className = 'pdf-item';
      const a = document.createElement('a');
      a.href = '/viewer.html?file=' + encodeURIComponent(p.name);
      a.textContent = p.name;
      a.target = '_blank';
      const meta = document.createElement('div');
      meta.style.marginLeft='auto';
      meta.style.fontSize='12px';
      meta.style.opacity='0.7';
      meta.textContent = new Date(p.mtime).toLocaleString();
      div.appendChild(a);

      const replaceBtn = document.createElement('button');
      replaceBtn.className = 'btn';
      replaceBtn.textContent = 'Replace';
      replaceBtn.addEventListener('click', ()=>{
        const fileInput = document.getElementById('file-input');
        fileInput.click();
        fileInput.onchange = async function(){
          const file = fileInput.files[0];
          if (!file) return;
          const fd = new FormData();
          fd.append('file', file);
          fd.append('name', p.name); // overwrite existing
          const res = await fetch('/api/upload',{ method:'POST', body: fd });
          if (!res.ok) alert('Upload failed');
          else {
            alert('Replaced ' + p.name);
            fileInput.value='';
          }
        };
      });
      const downloadBtn = document.createElement('a');
      downloadBtn.className='btn';
      downloadBtn.style.marginLeft='8px';
      downloadBtn.href = '/pdfs/' + encodeURIComponent(p.name);
      downloadBtn.textContent = 'Download';
      downloadBtn.target = '_blank';

      div.appendChild(replaceBtn);
      div.appendChild(downloadBtn);
      div.appendChild(meta);
      container.appendChild(div);
    });
  }

  async function fetchPdfs(){
    const res = await fetch('/api/pdfs');
    if (!res.ok) return [];
    return await res.json();
  }

  async function checkSession(){
    const res = await fetch('/api/session', { credentials: 'same-origin' });
    if (!res.ok) return {isAdmin:false};
    return await res.json();
  }

  document.addEventListener('DOMContentLoaded', async ()=>{
    const loginPanel = document.getElementById('login-panel');
    const adminPanel = document.getElementById('admin-panel');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const passwordInput = document.getElementById('password');

    // Check session defensively so script continues even if server is unreachable
    let sess = { isAdmin: false };
    try {
      sess = await checkSession();
    } catch (err) {
      console.error('Session check failed:', err);
      document.getElementById('login-msg').textContent = 'Server unreachable. Make sure the server is running.';
    }
    if (sess && sess.isAdmin) {
      loginPanel.style.display = 'none'; adminPanel.style.display = 'block';
      const pdfs = await fetchPdfs(); renderList(pdfs);
    }

    loginBtn.addEventListener('click', async ()=>{
      console.log('Admin login button clicked');
      const p = passwordInput.value;
      try {
        const res = await fetch('/api/login', { method: 'POST', credentials: 'same-origin', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ password: p }) });
        if (!res.ok) {
          if (res.status === 403) document.getElementById('login-msg').textContent = 'Invalid password';
          else document.getElementById('login-msg').textContent = 'Login failed: ' + res.statusText;
          return;
        }
        document.getElementById('login-msg').textContent='';
        loginPanel.style.display='none'; adminPanel.style.display='block';
        const pdfs = await fetchPdfs(); renderList(pdfs);
      } catch (err) {
        console.error('Login request failed:', err);
        document.getElementById('login-msg').textContent = 'Login failed (server unreachable)';
      }
    });

    logoutBtn.addEventListener('click', async ()=>{
      await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
      window.location.reload();
    });

    uploadBtn.addEventListener('click', async ()=>{
      const fileInput = document.getElementById('file-input');
      if (!fileInput.files[0]) return alert('Pick a file to upload');
      const file = fileInput.files[0];
      const name = document.getElementById('file-name').value.trim();
      const fd = new FormData(); fd.append('file', file); if (name) fd.append('name', name);
      const res = await fetch('/api/upload', { method: 'POST', credentials: 'same-origin', body: fd });
      if (!res.ok) return alert('Upload failed');
      const json = await res.json();
      alert('Uploaded: ' + json.file.name);
      fileInput.value=''; document.getElementById('file-name').value='';
      const pdfs = await fetchPdfs(); renderList(pdfs);
    });

    socket.on('pdf-updated', async meta => {
      const pdfs = await fetchPdfs(); renderList(pdfs);
    });
    socket.on('pdf-deleted', async meta => {
      const pdfs = await fetchPdfs(); renderList(pdfs);
    });

    // Subjects
    async function renderSubjectsList(subjects){
      const container = document.getElementById('subjects-list');
      container.innerHTML = '';

      // Fetch existing PDFs so we can show Add/Remove state per subject
      let existingPdfs = [];
      try {
        const r = await fetch('/api/pdfs');
        if (r.ok) existingPdfs = await r.json();
      } catch (e) { /* ignore */ }
      const pdfNames = new Set(existingPdfs.map(p => p.name));

      Object.keys(subjects).forEach(cat => {
        const h = document.createElement('h4'); h.textContent = cat; container.appendChild(h);
        const div = document.createElement('div');
        subjects[cat].forEach(s => {
          const row = document.createElement('div'); row.style.display='flex'; row.style.gap='8px'; row.style.alignItems='center'; row.style.padding='6px 0';
          const a = document.createElement('a'); a.href = s.filename; a.textContent = s.title; row.appendChild(a);

          // Determine pdf filename for this subject (page name without .html -> .pdf)
          const pdfName = s.filename.replace(/\.html$/i, '') + '.pdf';
          const exists = pdfNames.has(pdfName);

          // Add PDF button
          const addPdfBtn = document.createElement('button');
          addPdfBtn.className = 'btn btn-primary';
          addPdfBtn.textContent = 'Add PDF';
          addPdfBtn.style.marginLeft = '8px';
          addPdfBtn.disabled = exists;
          addPdfBtn.title = exists ? 'A PDF already exists for this subject' : 'Upload a PDF for this subject';
          addPdfBtn.addEventListener('click', ()=>{
            const fileInput = document.createElement('input');
            fileInput.type = 'file'; fileInput.accept = '.pdf';
            fileInput.onchange = async function(){
              const file = fileInput.files[0]; if (!file) return;
              const fd = new FormData(); fd.append('file', file); fd.append('name', pdfName);
              const res = await fetch('/api/upload', { method: 'POST', credentials: 'same-origin', body: fd });
              if (!res.ok) { const j = await res.json().catch(()=>{}); alert('Upload failed: ' + (j && j.error ? j.error : res.statusText)); return; }
              const j = await res.json(); alert('Uploaded: ' + (j.file && j.file.name ? j.file.name : file.name));
              // refresh pdf list and re-render subjects to update button states
              const pdfs = await fetchPdfs(); renderList(pdfs);
              const subs = await fetch('/api/subjects'); if (subs.ok) renderSubjectsList(await subs.json());
            };
            fileInput.click();
          });

          // Remove PDF button
          const removePdfBtn = document.createElement('button');
          removePdfBtn.className = 'btn btn-danger';
          removePdfBtn.textContent = 'Remove PDF';
          removePdfBtn.style.marginLeft = '8px';
          removePdfBtn.disabled = !exists;
          removePdfBtn.addEventListener('click', async ()=>{
            if (!confirm('Delete PDF "' + pdfName + '" for "' + s.title + '"?')) return;
            const res = await fetch('/api/pdfs/delete', { method: 'POST', credentials: 'same-origin', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ filename: pdfName }) });
            if (!res.ok) { const j = await res.json().catch(()=>{}); alert('Delete failed: ' + (j && j.error ? j.error : res.statusText)); return; }
            alert('Deleted ' + pdfName);
            const pdfs = await fetchPdfs(); renderList(pdfs);
            const subs = await fetch('/api/subjects'); if (subs.ok) renderSubjectsList(await subs.json());
          });

          const status = document.createElement('span'); status.style.marginLeft='auto'; status.style.fontSize='12px'; status.style.opacity='0.8'; status.textContent = exists ? 'PDF exists' : 'No PDF';

          // Delete subject button
          const del = document.createElement('button'); del.textContent='Delete'; del.className='btn btn-danger'; del.style.marginLeft='8px';
          del.addEventListener('click', async ()=>{
            if (!confirm('Delete subject "'+s.title+'"?')) return;
            const res = await fetch('/api/subjects/delete',{ method:'POST', credentials: 'same-origin', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ filename: s.filename, category: cat })});
            if (!res.ok) { const j = await res.json(); alert('Error: '+(j.error||res.statusText)); return; }
            const newSubs = await fetch('/api/subjects'); renderSubjectsList(await newSubs.json());
          });

          row.appendChild(addPdfBtn);
          row.appendChild(removePdfBtn);
          row.appendChild(status);
          row.appendChild(del);
          div.appendChild(row);
        });
        container.appendChild(div);
      });
    }

    document.getElementById('subject-add-btn').addEventListener('click', async ()=>{
      const title = document.getElementById('subject-title').value.trim();
      const category = document.getElementById('subject-category').value;
      if (!title) return alert('Enter a title');
      const res = await fetch('/api/subjects/add',{ method:'POST', credentials: 'same-origin', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title, category })});
      if (!res.ok) { const j = await res.json(); alert('Error: '+(j.error||res.statusText)); return; }
      document.getElementById('subject-title').value='';
      const subs = await fetch('/api/subjects'); renderSubjectsList(await subs.json());
    });

    socket.on('subjects-updated', async subs => {
      const s = await fetch('/api/subjects'); renderSubjectsList(await s.json());
    });

    // initial subjects load
    (async ()=>{ const s = await fetch('/api/subjects'); if (s.ok) renderSubjectsList(await s.json()); })();
  });
})();
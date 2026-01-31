// server.js
// Minimal Node.js + Express server to host PDFs, provide admin uploads, and real-time updates with Socket.IO

const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const session = require('express-session');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const PDF_DIR = path.join(__dirname, 'pdfs');

if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR);

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: process.env.SESSION_SECRET || 'change-me', resave: false, saveUninitialized: false }));

// Serve static site files and pdfs
app.use(express.static(path.join(__dirname)));
app.use('/pdfs', express.static(PDF_DIR, { maxAge: '1h' }));

// Multer setup: use memory storage then write to disk to control filename/overwrite
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

function isAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

// API: list PDFs
app.get('/api/pdfs', (req, res) => {
  fs.readdir(PDF_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: 'Failed to read pdfs directory' });
    const pdfs = files.filter(f => /\.pdf$/i.test(f)).map(f => {
      const stat = fs.statSync(path.join(PDF_DIR, f));
      return { name: f, url: '/pdfs/' + encodeURIComponent(f), mtime: stat.mtime.getTime() };
    });
    res.json(pdfs);
  });
});

// Subjects persistence
const SUBJECTS_FILE = path.join(__dirname, 'subjects.json');

function sanitizeFileName(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9\- ]+/g, '').replace(/\s+/g, '-') + '.html';
}

function loadSubjectsFromPages() {
  const subjects = { main: [], 'data-science': [], cyber: [] };
  try {
    // parse index.html main list
    const idx = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    const mainMatches = idx.match(/<ul[^>]*id="main-subjects-list"[\s\S]*?<\/ul>/i);
    if (mainMatches) {
      const lis = mainMatches[0].match(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi) || [];
      lis.forEach(a => {
        const m = a.match(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/i);
        if (m) subjects.main.push({ title: m[2].trim(), filename: m[1].trim() });
      });
    }
  } catch (e) {
    console.warn('Could not read index.html to bootstrap subjects', e.message);
  }
  try {
    const ds = fs.readFileSync(path.join(__dirname, 'data-science.html'), 'utf8');
    const matches = ds.match(/<ul[^>]*id="data-science-subjects"[\s\S]*?<\/ul>/i);
    if (matches) {
      const lis = matches[0].match(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi) || [];
      lis.forEach(a => {
        const m = a.match(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/i);
        if (m) subjects['data-science'].push({ title: m[2].trim(), filename: m[1].trim() });
      });
    }
  } catch (e) { }
  try {
    const cy = fs.readFileSync(path.join(__dirname, 'cybersecurity.html'), 'utf8');
    const matches = cy.match(/<ul[^>]*id="cyber-subjects"[\s\S]*?<\/ul>/i);
    if (matches) {
      const lis = matches[0].match(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi) || [];
      lis.forEach(a => {
        const m = a.match(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/i);
        if (m) subjects['cyber'].push({ title: m[2].trim(), filename: m[1].trim() });
      });
    }
  } catch (e) { }
  return subjects;
}

function readSubjects() {
  try {
    if (fs.existsSync(SUBJECTS_FILE)) {
      return JSON.parse(fs.readFileSync(SUBJECTS_FILE, 'utf8'));
    }
    // bootstrap
    const boot = loadSubjectsFromPages();
    fs.writeFileSync(SUBJECTS_FILE, JSON.stringify(boot, null, 2));
    return boot;
  } catch (e) {
    console.error('Failed to read subjects.json', e);
    return { main: [], 'data-science': [], cyber: [] };
  }
}

function writeSubjects(subjects) {
  fs.writeFileSync(SUBJECTS_FILE, JSON.stringify(subjects, null, 2));
}

// API: list subjects
app.get('/api/subjects', (req, res) => {
  const subs = readSubjects();
  res.json(subs);
});


// API: login
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ success: true });
  }
  return res.status(403).json({ error: 'Invalid password' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    return res.json({ success: true });
  });
});

app.get('/api/session', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

// API: upload PDF (admin only). Use field 'file'. Optional field 'name' to set filename.
app.post('/api/upload', isAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Missing file' });
  const originalName = req.body.name && String(req.body.name).trim() ? path.basename(req.body.name) : path.basename(req.file.originalname);
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const targetPath = path.join(PDF_DIR, safeName);
  fs.writeFile(targetPath, req.file.buffer, err => {
    if (err) return res.status(500).json({ error: 'Failed to save file' });
    const stat = fs.statSync(targetPath);
    const meta = { name: safeName, url: '/pdfs/' + encodeURIComponent(safeName), mtime: stat.mtime.getTime() };
    // Notify clients via socket.io
    io.emit('pdf-updated', meta);
    return res.json({ success: true, file: meta });
  });
});

// API: delete PDF (admin only)
app.post('/api/pdfs/delete', isAdmin, express.json(), (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: 'Missing filename' });
  const safe = path.basename(filename);
  const target = path.join(PDF_DIR, safe);
  try {
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
      io.emit('pdf-deleted', { name: safe });
      return res.json({ success: true });
    } else {
      return res.status(404).json({ error: 'Not found' });
    }
  } catch (e) {
    console.error('Failed to delete PDF', e);
    return res.status(500).json({ error: 'Delete failed' });
  }
});

// API: add subject (admin only)
app.post('/api/subjects/add', isAdmin, (req, res) => {
  const { title, filename, category } = req.body;
  if (!title || !category) return res.status(400).json({ error: 'Missing title or category' });
  const safeFilename = filename ? path.basename(filename) : sanitizeFileName(title);
  const subjects = readSubjects();
  if (!subjects[category]) subjects[category] = [];
  // If already exists in list, reject
  if (subjects[category].some(s => s.filename === safeFilename)) return res.status(400).json({ error: 'Subject already exists' });
  // Create file template
  const safeTitle = String(title).replace(/"/g, '&quot;');
  const template = `<!DOCTYPE html>\n<html>\n<head>\n    <title>${safeTitle}</title>\n    <style>\n        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }\n        .container { max-width: 900px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }\n        .controls { margin-bottom: 20px; }\n        .download-btn { display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; cursor: pointer; font-size: 16px; border: none; }\n        .remove-pdf-btn { margin-left: 8px; background:#e53935;color:#fff;border:none;padding:6px 8px;border-radius:4px;cursor:pointer }\n    </style>\n</head>\n<body>\n    <div class="container">\n        <h2>${safeTitle} Question Bank</h2>\n        <div class="controls">\n            <button id="add-pdf-btn" class="download-btn">➕ Add PDF</button>\n            <div id="pdf-links" style="margin-top:10px"></div>\n        </div>\n\n        <iframe id="pdf-viewer" src="pdfs/${safeFilename.replace(/\.html$/, '')}.pdf" type="application/pdf" style="width:100%;height:600px;border:1px solid #ddd;border-radius:4px"></iframe>\n\n        <br><br>\n        <a href="index.html" class="back-link">← Back to All Subjects</a>\n    </div>\n    <script src="add-pdf.js"></script>\n    <script src="manage-subjects.js"></script>\n</body>\n</html>`;
  try {
    fs.writeFileSync(path.join(__dirname, safeFilename), template);
    subjects[category].push({ title: title, filename: safeFilename });
    writeSubjects(subjects);
    io.emit('subjects-updated', subjects);
    return res.json({ success: true, file: safeFilename });
  } catch (e) {
    console.error('Failed to create subject file', e);
    return res.status(500).json({ error: 'Failed to create file' });
  }
});

// API: delete subject (admin only)
app.post('/api/subjects/delete', isAdmin, (req, res) => {
  const { filename, category } = req.body;
  if (!filename || !category) return res.status(400).json({ error: 'Missing filename or category' });
  const subjects = readSubjects();
  if (!subjects[category]) return res.status(400).json({ error: 'Unknown category' });
  const idx = subjects[category].findIndex(s => s.filename === filename);
  if (idx === -1) return res.status(404).json({ error: 'Subject not found' });
  try {
    const p = path.join(__dirname, filename);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch (e) {
    console.warn('Failed to remove subject file', e.message);
  }
  subjects[category].splice(idx,1);
  writeSubjects(subjects);
  io.emit('subjects-updated', subjects);
  return res.json({ success: true });
});

// Fallback for 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

io.on('connection', socket => {
  // Send initial list
  fs.readdir(PDF_DIR, (err, files) => {
    if (!err) {
      const pdfs = files.filter(f => /\.pdf$/i.test(f)).map(f => {
        const stat = fs.statSync(path.join(PDF_DIR, f));
        return { name: f, url: '/pdfs/' + encodeURIComponent(f), mtime: stat.mtime.getTime() };
      });
      socket.emit('pdfs-list', pdfs);
    }
  });
});

server.listen(PORT, () => {
  console.log('Server listening on http://localhost:' + PORT);
});

# PDF Links — Admin-upload + Real-time viewers

This adds a minimal Node.js server to host PDFs, let a single admin upload/replace PDFs, and notify viewers in real time when a PDF is updated.

How it works
- Admin logs in at `/public/admin.html` using the password in `.env` (or `ADMIN_PASSWORD` environment variable). Uploading a file overwrites any existing file with the same name.
- Admin can also manage subjects from the Admin UI: add new subjects (automatically creates an HTML file) and delete existing subjects. Changes are persisted in `subjects.json` and broadcast to all connected clients.
- Public pages include a `div#pdf-links` (e.g., `data-science.html`) and load `/public/js/client.js` which fetches `/api/pdfs` and renders links. Each link points to `viewer.html?file=<filename>` which opens the PDF in an iframe.
- Subject lists on site pages are rendered dynamically from `/api/subjects`; only admins see add/remove controls (they appear on the page when logged in). Subject updates are broadcast via Socket.IO (`subjects-updated`) so normal users see changes immediately.
Quick start
1. Install Node.js (v16+ recommended).
2. Copy `.env.example` to `.env` and set `ADMIN_PASSWORD` and `SESSION_SECRET`.
3. Install dependencies and start the server:

   npm install
   npm start

4. Open http://localhost:3000/
- Admin UI: http://localhost:3000/public/admin.html
- Viewer example: click PDF links on pages with a `#pdf-links` area (e.g., `data-science.html`).

Security notes
- This is intended as a simple self-hosted demo. For production, use HTTPS, a secure admin authentication mechanism, and consider file sanitization and size limits.

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { subjectsDb } from './db.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve files from the root project folder (where the PDFs are)
app.use('/pdfs', express.static(path.join(__dirname, '..', 'pdfs')));
app.use('/files', express.static(path.join(__dirname, '..')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer Setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Helper to check if user is admin
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized as admin' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// --- AUTH ROUTES ---

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    // For this project, we use credentials from .env
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
        const token = jwt.sign({ email, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
        return res.json({ token, role: 'admin' });
    }

    res.status(401).json({ message: 'Invalid credentials' });
});

// --- SUBJECT ROUTES ---

// Fetch all subjects (Public - for both students and admins)
app.get('/api/subjects', async (req, res) => {
    try {
        const subjects = await subjectsDb.find({});
        res.json(subjects);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching subjects' });
    }
});

// Add a subject (Admin only - now supports file upload)
app.post('/api/subjects', authenticateAdmin, upload.single('pdf'), async (req, res) => {
    const { name, category } = req.body;
    let pdfUrl = req.body.pdfUrl || '';

    if (req.file) {
        pdfUrl = `uploads/${req.file.filename}`;
    }

    if (!name || !category) {
        return res.status(400).json({ message: 'Name and category are required' });
    }
    try {
        const newSubject = await subjectsDb.insert({
            name,
            category,
            pdfUrl,
            createdAt: new Date()
        });
        res.status(201).json(newSubject);
    } catch (err) {
        console.error('Error adding subject:', err);
        res.status(500).json({ message: 'Error adding subject' });
    }
});

// Remove a subject (Admin only)
app.delete('/api/subjects/:id', authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await subjectsDb.remove({ _id: id });
        res.json({ message: 'Subject removed successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error removing subject' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});

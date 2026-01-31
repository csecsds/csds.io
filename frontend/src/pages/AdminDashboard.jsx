import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ShieldCheck, Database, X, ExternalLink } from 'lucide-react';

const AdminDashboard = ({ token }) => {
    const [subjects, setSubjects] = useState([]);
    const [newName, setNewName] = useState('');
    const [newPdfUrl, setNewPdfUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [newCategory, setNewCategory] = useState('Cyber Security');
    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            const resp = await axios.get('http://localhost:5000/api/subjects');
            setSubjects(resp.data);
        } catch (err) {
            showMsg('Failed to fetch subjects', 'error');
        }
    };

    const showMsg = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newName) return;
        const formData = new FormData();
        formData.append('name', newName);
        formData.append('category', newCategory);
        if (selectedFile) {
            formData.append('pdf', selectedFile);
        } else {
            formData.append('pdfUrl', newPdfUrl);
        }

        try {
            await axios.post('http://localhost:5000/api/subjects',
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            setNewName('');
            setNewPdfUrl('');
            setSelectedFile(null);
            // Reset file input manually
            document.getElementById('pdf-upload').value = '';
            fetchSubjects();
            showMsg('Subject added successfully!', 'success');
        } catch (err) {
            showMsg('Error adding subject', 'error');
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`http://localhost:5000/api/subjects/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchSubjects();
            showMsg('Subject removed', 'success');
        } catch (err) {
            showMsg('Error removing subject', 'error');
        }
    };

    const openPdf = (url) => {
        if (!url) return;
        let fullUrl;
        if (url.startsWith('http')) {
            fullUrl = url;
        } else if (url.startsWith('uploads/')) {
            fullUrl = `http://localhost:5000/${url}`;
        } else {
            fullUrl = `http://localhost:5000/files/${url}`;
        }
        window.open(fullUrl, '_blank');
    };

    const categorized = {
        'Cyber Security': subjects.filter(s => s.category === 'Cyber Security'),
        'Data Science': subjects.filter(s => s.category === 'Data Science')
    };

    return (
        <div className="dashboard-container">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-header">
                <h1>Admin Command Center</h1>
                <p>Manage curriculum subjects for all categories</p>
            </motion.div>

            <section className="admin-actions glass-card">
                <h3><Plus size={20} /> Add New Subject</h3>
                <form onSubmit={handleAdd} className="add-form">
                    <input
                        type="text"
                        placeholder="Subject Name (e.g. Pentesting)"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        required
                    />
                    <div className="upload-group">
                        <label htmlFor="pdf-upload" className="file-label">
                            {selectedFile ? selectedFile.name : 'Upload PDF'}
                        </label>
                        <input
                            id="pdf-upload"
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => setSelectedFile(e.target.files[0])}
                            className="hidden-file-input"
                        />
                    </div>
                    <div className="or-text">OR</div>
                    <input
                        type="text"
                        placeholder="PDF Link/Filename"
                        value={newPdfUrl}
                        onChange={(e) => setNewPdfUrl(e.target.value)}
                        disabled={!!selectedFile}
                    />
                    <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                        <option value="Cyber Security">Cyber Security</option>
                        <option value="Data Science">Data Science</option>
                    </select>
                    <button type="submit" className="cyber-btn">Add Subject</button>
                </form>
            </section>

            <AnimatePresence>
                {message.text && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`alert ${message.type}`}
                    >
                        {message.text}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="subjects-grid">
                <section className="category-column">
                    <div className="category-title cyber-title">
                        <ShieldCheck /> Cyber Security
                    </div>
                    <div className="subject-list">
                        {categorized['Cyber Security'].map(s => (
                            <motion.div layout key={s._id} className="subject-card admin-sc">
                                <div className="subject-info" onClick={() => s.pdfUrl && openPdf(s.pdfUrl)} style={{ cursor: s.pdfUrl ? 'pointer' : 'default' }}>
                                    <span className="subject-name-text">
                                        {s.name} {s.pdfUrl && <ExternalLink size={14} style={{ marginLeft: '5px', verticalAlign: 'middle', opacity: 0.6 }} />}
                                    </span>
                                    {s.pdfUrl && <small className="pdf-tag">{s.pdfUrl}</small>}
                                </div>
                                <div className="admin-card-actions">
                                    <button onClick={() => handleDelete(s._id)} className="delete-btn" title="Delete Subject">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                <section className="category-column">
                    <div className="category-title ds-title">
                        <Database /> Data Science
                    </div>
                    <div className="subject-list">
                        {categorized['Data Science'].map(s => (
                            <motion.div layout key={s._id} className="subject-card admin-sc">
                                <div className="subject-info" onClick={() => s.pdfUrl && openPdf(s.pdfUrl)} style={{ cursor: s.pdfUrl ? 'pointer' : 'default' }}>
                                    <span className="subject-name-text">
                                        {s.name} {s.pdfUrl && <ExternalLink size={14} style={{ marginLeft: '5px', verticalAlign: 'middle', opacity: 0.6 }} />}
                                    </span>
                                    {s.pdfUrl && <small className="pdf-tag">{s.pdfUrl}</small>}
                                </div>
                                <div className="admin-card-actions">
                                    <button onClick={() => handleDelete(s._id)} className="delete-btn" title="Delete Subject">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AdminDashboard;

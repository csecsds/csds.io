import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { GraduationCap, ShieldCheck, Database, RefreshCw, FileText } from 'lucide-react';

const StudentPage = () => {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        setLoading(true);
        try {
            const resp = await axios.get('http://localhost:5000/api/subjects');
            setSubjects(resp.data);
        } catch (err) {
            console.error('Failed to fetch subjects');
        } finally {
            setLoading(false);
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
        <div className="student-container">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="student-hero"
            >
                <GraduationCap size={48} className="hero-icon" />
                <h1>Cyber Security & Data Science Portal</h1>
                <p>Explore our current modules and roadmap</p>
                <button onClick={fetchSubjects} className="refresh-btn">
                    <RefreshCw size={16} /> Refresh List
                </button>
            </motion.div>

            <div className="subjects-grid">
                <section className="category-column">
                    <div className="category-header cs-header">
                        <ShieldCheck size={24} />
                        <h2>Cyber Security</h2>
                    </div>
                    <div className="subject-list">
                        {categorized['Cyber Security'].length > 0 ? (
                            categorized['Cyber Security'].map((s, idx) => (
                                <motion.div
                                    key={s._id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="subject-card student-sc"
                                >
                                    <div className="subject-content">
                                        <div className="dot"></div>
                                        <span>{s.name}</span>
                                    </div>
                                    {s.pdfUrl && (
                                        <button className="view-pdf-btn" onClick={() => openPdf(s.pdfUrl)}>
                                            <FileText size={16} /> Question Bank
                                        </button>
                                    )}
                                </motion.div>
                            ))
                        ) : (
                            <p className="empty-msg">No subjects listed yet.</p>
                        )}
                    </div>
                </section>

                <section className="category-column">
                    <div className="category-header ds-header">
                        <Database size={24} />
                        <h2>Data Science</h2>
                    </div>
                    <div className="subject-list">
                        {categorized['Data Science'].length > 0 ? (
                            categorized['Data Science'].map((s, idx) => (
                                <motion.div
                                    key={s._id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="subject-card student-sc"
                                >
                                    <div className="subject-content">
                                        <div className="dot"></div>
                                        <span>{s.name}</span>
                                    </div>
                                    {s.pdfUrl && (
                                        <button className="view-pdf-btn" onClick={() => openPdf(s.pdfUrl)}>
                                            <FileText size={16} /> Question Bank
                                        </button>
                                    )}
                                </motion.div>
                            ))
                        ) : (
                            <p className="empty-msg">No subjects listed yet.</p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default StudentPage;

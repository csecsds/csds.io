import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, AlertCircle } from 'lucide-react';

const Login = ({ setToken }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const resp = await axios.post('http://localhost:5000/api/auth/login', { email, password });
            localStorage.setItem('adminToken', resp.data.token);
            setToken(resp.data.token);
            navigate('/admin');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Check credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card login-card"
            >
                <h2>Admin Login</h2>
                <p>Access the management dashboard</p>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <Mail className="input-icon" size={20} />
                        <input
                            type="email"
                            placeholder="Admin Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <Lock className="input-icon" size={20} />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="error-msg">
                            <AlertCircle size={16} /> {error}
                        </motion.div>
                    )}

                    <button type="submit" className="cyber-btn w-full" disabled={loading}>
                        {loading ? 'Authenticating...' : 'Login to Admin'}
                    </button>
                </form>


            </motion.div>
        </div>
    );
};

export default Login;

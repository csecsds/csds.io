import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, BookOpen, LogOut, User } from 'lucide-react';

const Header = ({ isAdmin, onLogout }) => {
    const navigate = useNavigate();

    return (
        <header className={`main-header ${isAdmin ? 'admin-header' : 'student-header'}`}>
            <div className="header-content">
                <Link to="/" className="logo">
                    <BookOpen className="logo-icon" />
                    <span>EduPortal <small>{isAdmin ? 'Admin' : 'Student'}</small></span>
                </Link>

                <div className="college-name">
                    <img
                        src="/college_logo.jpg"
                        alt="GIST Logo"
                        className="college-logo-center"
                    />
                    <span>GEETHANJALI INSTITUTE OF SCIENCE AND TECHNOLOGY</span>
                </div>

                <nav>
                    <Link to="/" className="nav-link">Home</Link>
                    {isAdmin ? (
                        <>
                            <Link to="/admin" className="nav-link">Dashboard</Link>
                            <button onClick={onLogout} className="logout-btn">
                                <LogOut size={18} /> Logout
                            </button>
                        </>
                    ) : (
                        <Link to="/login" className="login-nav-btn">
                            <User size={18} /> Admin Login
                        </Link>
                    )}
                </nav>
            </div>
        </header>
    );
};

export default Header;

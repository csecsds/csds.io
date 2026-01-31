# 🎓 EduPortal - GIST Cyber Security & Data Science

A modern, full-stack educational portal designed for **Geethanjali Institute of Science and Technology**. This platform allows admins to manage curriculum subjects and students to access question banks and study materials seamlessly.

## 🚀 Features

- **GIST Branding**: Official college logo and centered institutional identity.
- **Admin Command Center**: 
  - Secure JWT authentication.
  - Add/Remove subjects for Cyber Security and Data Science.
  - **Real PDF Uploads**: Upload study materials directly from your computer.
- **Student Portal**:
  - Responsive categorization of modules.
  - Instant access to "Question Bank" PDFs in a new browser tab.
- **Modern UI**: Built with React, Framer Motion for animations, and Lucide icons.

## 🛠️ Technology Stack

- **Frontend**: React, Vite, Framer Motion, Axios, Lucide React.
- **Backend**: Node.js, Express, Multer (for file uploads), NeDB (for lightweight database).

## 📥 Installation & Setup

### 1. Prerequisite
Ensure you have [Node.js](https://nodejs.org/) installed.

### 2. Backend Setup
1. Navigate to the `backend` folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example` and set your credentials:
   ```env
   PORT=5000
   JWT_SECRET=your_secret_key
   ADMIN_EMAIL=admin@gist.edu.in
   ADMIN_PASSWORD=your_password
   ```
4. Start the server:
   ```bash
   npm start
   ```

### 3. Frontend Setup
1. Navigate to the `frontend` folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 🌐 Usage
- **Student View**: `http://localhost:5173`
- **Admin Dashboard**: `http://localhost:5173/login`

## 📁 Project Structure
- `/frontend`: React application source code.
- `/backend`: Node.js server and API logic.
- `/backend/uploads`: Store for uploaded PDF files.

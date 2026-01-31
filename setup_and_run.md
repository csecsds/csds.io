# Educational Learning Platform - Setup Instructions

This is a full-stack application built with React, Node.js, and Express. It features Role-Based Access Control (RBAC) with an Admin and Student view.

## 🚀 How to Run

### 1. Prerequisites
- Node.js installed (v16+)
- npm installed

### 2. Backend Setup
1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the backend server:
   ```bash
   npm start
   ```
   The server will run on [http://localhost:5000](http://localhost:5000).

### 3. Frontend Setup
1. Open a **new** terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the React development server:
   ```bash
   npm run dev
   ```
   The application will be available at [http://localhost:5173](http://localhost:5173).

---

## 🔑 Admin Credentials
- **Email**: `admin@csds.io`
- **Password**: `admin123`

---

## 🛠 Tech Stack
- **Frontend**: React, Vite, Framer Motion (Animations), Lucide React (Icons), Axios.
- **Backend**: Node.js, Express, JWT (Authentication), NeDB (JSON-based Database).
- **Styling**: Glassmorphism, CSS Variables, Responsive Design.

## 📂 Project Structure
- `backend/`: Express server, authentication logic, and NeDB database.
- `frontend/src/pages/`:
    - `Login.jsx`: Admin login portal.
    - `AdminDashboard.jsx`: Subject management.
    - `StudentPage.jsx`: Public view for students.
- `frontend/src/components/`: Reusable components like the Header.

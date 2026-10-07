# Project Mercy Student Attendance Management System

## Features
- Admin and section-teacher authentication
- Admin creates one teacher account for each section
- Teachers can see only their assigned section
- **Only Admin can register or edit students**
- Automatic PMM student IDs and QR codes
- QR-code attendance and manual attendance
- Camera selection with Start/Stop controls for QR scanning
- SQLite database (`better-sqlite3`) created automatically
- School, phone, email and class information for students
- Attendance reports and CSV export
- Project Mercy wellness image

## Login
Admin:
- Email: `admin@pmm.local`
- Password: `admin123`

Teachers are created by Admin under **Sections & Accounts**.

## Local run
```cmd
npm install
npm start
```
Open `http://localhost:3000/`.

## Render
Build command: `npm install`
Start command: `npm start`

Set `SESSION_SECRET` in Render. For permanent SQLite data on Render, use persistent storage; otherwise use PostgreSQL for production persistence.

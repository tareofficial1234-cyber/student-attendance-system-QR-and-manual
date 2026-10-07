<<<<<<< HEAD
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
=======
# Student Attendance Management System

## Requirements
- Node.js 18+ recommended
- A modern browser
- Camera for QR scanning

## Install

Open a terminal in this project folder:

```bash
npm install
npm start
```

Then open:

http://localhost:3000

## Demo login

Username: `admin`
Password: `admin123`

## How to use

1. Log in.
2. Open Students.
3. Add students with unique Student IDs.
4. Click QR beside a student and print/save the QR.
5. Open QR Scanner.
6. Select a course.
7. Allow camera access.
8. Scan a student's QR.
9. Open Reports to view attendance.
10. Click Export CSV to download the report.

## Important

This is a working educational/local project. For production deployment, use hashed passwords, HTTPS, a production session store, CSRF protection, stronger validation, and proper user/role management.


## Attendance methods

The system now supports two attendance methods:

1. **QR Code** — use the QR Scanner to scan a student's QR code.
2. **Manual / Tick** — open Manual Attendance, select a course/date, tick the students who are present, and save.

Manual attendance records unchecked students as **Absent**. Reports and CSV exports include a **Method** column showing `QR` or `Manual`.

If you already have an existing `attendance.db`, the server automatically adds the new `method` column when it starts.
>>>>>>> ad92fe51612dc11db9bae6cf60f710ef9d7c7c77

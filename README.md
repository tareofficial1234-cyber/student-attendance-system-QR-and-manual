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

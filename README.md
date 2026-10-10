# Project Mercy Student Attendance Management System v2

This version keeps the original **QR attendance + manual attendance** and adds section-based access control.

## Main features

- Admin login: `admin@pmm.local` / `admin123`
- Admin creates student sections.
- Admin creates a separate email/password account for each section.
- Section users can only see and manage students and attendance belonging to their section.
- Admin can see all sections.
- Student registration includes:
  - Automatically generated Student ID (example `PMM-2026-00001`)
  - Name
  - School name
  - Phone
  - Email
  - Class/grade
  - Section
- Every student gets a unique QR token. The QR encodes the student's Project Mercy ID/token.
- QR attendance and manual/tick attendance are both supported.
- Reports show whether attendance was recorded by `QR` or `Manual`.
- CSV export is available.
- Registered students are not deleted from the interface; use edit instead so attendance history remains safe.
- Includes a local Project Mercy wellness/health image (`public/well.svg`).

## Run

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Important

For internet production deployment, set a strong `SESSION_SECRET`, use HTTPS, and use a persistent database/session store. The included admin password is for initial setup and should be changed before production.

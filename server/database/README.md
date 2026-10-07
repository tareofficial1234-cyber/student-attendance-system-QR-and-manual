# Project Mercy database

The application uses SQLite through `better-sqlite3`.

- The database is created automatically at `server/database/attendance.db` when the server starts.
- Tables include sections, users, students, courses and attendance.
- Student registration is restricted to Admin by the API.
- Section teachers can read only their assigned section and record attendance.
- Do not commit `attendance.db` to Git; `.gitignore` excludes it.

For Render, SQLite data is tied to the service filesystem. For permanent production data across redeploys, attach a persistent Render disk or migrate this database to PostgreSQL.

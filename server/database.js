const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dir = path.join(__dirname, "database");
fs.mkdirSync(dir, { recursive: true });

const db = new Database(path.join(dir, "attendance.db"));
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'teacher'
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  class_name TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  course_id INTEGER,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Present',
  method TEXT NOT NULL DEFAULT 'QR',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE SET NULL
);
`);

// Migrate older databases created before manual attendance was added.
const attendanceColumns = db.prepare("PRAGMA table_info(attendance)").all();
if (!attendanceColumns.some(c => c.name === "method")) {
  db.exec("ALTER TABLE attendance ADD COLUMN method TEXT NOT NULL DEFAULT 'QR'");
}

const user = db.prepare("SELECT id FROM users WHERE username='admin'").get();
if (!user) {
  db.prepare("INSERT INTO users(username,password,role) VALUES('admin','admin123','admin')").run();
}

if (db.prepare("SELECT COUNT(*) c FROM courses").get().c === 0) {
  db.prepare("INSERT INTO courses(name) VALUES (?)").run("General Class");
}

module.exports = db;
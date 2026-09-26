const express = require("express");
const session = require("express-session");
const path = require("path");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "change-this-secret-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax" }
}));

app.use(express.static(path.join(__dirname, "..", "public")));

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Not authenticated" });
  next();
}

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT id, username, role FROM users WHERE username=? AND password=?")
    .get(username, password);
  if (!user) return res.status(401).json({ error: "Invalid username or password" });
  req.session.user = user;
  res.json(user);
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/me", (req, res) => res.json(req.session.user || null));

app.get("/api/dashboard", requireAuth, (req, res) => {
  const totalStudents = db.prepare("SELECT COUNT(*) c FROM students").get().c;
  const today = new Date().toISOString().slice(0, 10);
  const presentToday = db.prepare("SELECT COUNT(*) c FROM attendance WHERE date=?").get(today).c;
  const totalAttendance = db.prepare("SELECT COUNT(*) c FROM attendance").get().c;
  const courses = db.prepare("SELECT COUNT(*) c FROM courses").get().c;
  res.json({ totalStudents, presentToday, totalAttendance, courses });
});

app.get("/api/students", requireAuth, (req, res) => {
  const students = db.prepare("SELECT * FROM students ORDER BY id DESC").all();
  res.json(students);
});

app.post("/api/students", requireAuth, (req, res) => {
  const { studentId, name, email, phone, className } = req.body;
  if (!studentId || !name) return res.status(400).json({ error: "Student ID and name are required" });
  try {
    const result = db.prepare(`
      INSERT INTO students(student_id,name,email,phone,class_name)
      VALUES(?,?,?,?,?)
    `).run(studentId, name, email || "", phone || "", className || "");
    res.json(db.prepare("SELECT * FROM students WHERE id=?").get(result.lastInsertRowid));
  } catch {
    res.status(400).json({ error: "Student ID already exists" });
  }
});

app.put("/api/students/:id", requireAuth, (req, res) => {
  const { studentId, name, email, phone, className } = req.body;
  db.prepare(`
    UPDATE students SET student_id=?, name=?, email=?, phone=?, class_name=?
    WHERE id=?
  `).run(studentId, name, email || "", phone || "", className || "", req.params.id);
  res.json(db.prepare("SELECT * FROM students WHERE id=?").get(req.params.id));
});

app.delete("/api/students/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM students WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

app.get("/api/students/:studentId/qr", requireAuth, async (req, res) => {
  const student = db.prepare("SELECT * FROM students WHERE student_id=?").get(req.params.studentId);
  if (!student) return res.status(404).json({ error: "Student not found" });
  const QRCode = require("qrcode");
  const dataUrl = await QRCode.toDataURL(`ATTENDANCE:${student.student_id}`);
  res.json({ dataUrl });
});

app.get("/api/courses", requireAuth, (req, res) => {
  res.json(db.prepare("SELECT * FROM courses ORDER BY name").all());
});

app.post("/api/courses", requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Course name is required" });
  const result = db.prepare("INSERT INTO courses(name) VALUES(?)").run(name);
  res.json(db.prepare("SELECT * FROM courses WHERE id=?").get(result.lastInsertRowid));
});

app.post("/api/attendance/scan", requireAuth, (req, res) => {
  const { qr, courseId } = req.body;
  if (!qr) return res.status(400).json({ error: "QR data is required" });

  const studentId = qr.startsWith("ATTENDANCE:") ? qr.replace("ATTENDANCE:", "") : qr;
  const student = db.prepare("SELECT * FROM students WHERE student_id=?").get(studentId);
  if (!student) return res.status(404).json({ error: "Student not found" });

  const course = courseId ? db.prepare("SELECT * FROM courses WHERE id=?").get(courseId) : null;
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 8);

  const exists = db.prepare(`
    SELECT id FROM attendance
    WHERE student_id=? AND date=? AND course_id IS ?
  `).get(student.id, date, course ? course.id : null);

  if (exists) return res.status(409).json({
    error: "Attendance already recorded for this student, course and date",
    student
  });

  const result = db.prepare(`
    INSERT INTO attendance(student_id,course_id,date,time,status,method)
    VALUES(?,?,?,?,?,?)
  `).run(student.id, course ? course.id : null, date, time, "Present", "QR");

  res.json({
    message: "Attendance recorded",
    attendanceId: result.lastInsertRowid,
    student,
    course
  });
});


// Manual/tick attendance. The teacher sends the students who are present.
// Unchecked students are recorded as Absent for the selected course/date.
app.post("/api/attendance/manual", requireAuth, (req, res) => {
  const { courseId, date, presentStudentIds } = req.body;

  if (!courseId) return res.status(400).json({ error: "Course is required" });
  if (!date) return res.status(400).json({ error: "Date is required" });
  if (!Array.isArray(presentStudentIds)) {
    return res.status(400).json({ error: "presentStudentIds must be an array" });
  }

  const course = db.prepare("SELECT * FROM courses WHERE id=?").get(courseId);
  if (!course) return res.status(404).json({ error: "Course not found" });

  const allStudents = db.prepare("SELECT * FROM students ORDER BY name").all();
  const presentSet = new Set(presentStudentIds.map(Number));
  const now = new Date();
  const time = now.toTimeString().slice(0, 8);

  const findExisting = db.prepare(`
    SELECT id FROM attendance
    WHERE student_id=? AND date=? AND course_id=?
  `);

  const insert = db.prepare(`
    INSERT INTO attendance(student_id,course_id,date,time,status,method)
    VALUES(?,?,?,?,?,?)
  `);

  const update = db.prepare(`
    UPDATE attendance
    SET time=?, status='Present', method='Manual'
    WHERE id=?
  `);

  const updateAbsent = db.prepare(`
    UPDATE attendance
    SET time=?, status='Absent', method='Manual'
    WHERE id=?
  `);

  const transaction = db.transaction(() => {
    let saved = 0;

    for (const student of allStudents) {
      const existing = findExisting.get(student.id, date, course.id);
      const isPresent = presentSet.has(student.id);

      if (existing) {
        if (isPresent) update.run(time, existing.id);
        else updateAbsent.run(time, existing.id);
      } else {
        insert.run(
          student.id,
          course.id,
          date,
          time,
          isPresent ? "Present" : "Absent",
          "Manual"
        );
      }
      saved++;
    }
    return saved;
  });

  const saved = transaction();

  res.json({
    message: "Manual attendance saved",
    saved,
    course
  });
});

app.get("/api/attendance", requireAuth, (req, res) => {
  const { date, studentId, courseId } = req.query;
  let sql = `
    SELECT a.id, s.student_id AS studentCode, s.name, s.class_name,
           c.name AS course, a.date, a.time, a.status, a.method
    FROM attendance a
    JOIN students s ON s.id=a.student_id
    LEFT JOIN courses c ON c.id=a.course_id
    WHERE 1=1
  `;
  const params = {};
  if (date) { sql += " AND a.date=@date"; params.date = date; }
  if (studentId) { sql += " AND s.student_id=@studentId"; params.studentId = studentId; }
  if (courseId) { sql += " AND a.course_id=@courseId"; params.courseId = courseId; }
  sql += " ORDER BY a.date DESC, a.time DESC";
  res.json(db.prepare(sql).all(params));
});

app.get("/api/attendance/csv", requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT s.student_id, s.name, s.class_name, c.name course,
           a.date, a.time, a.status, a.method
    FROM attendance a
    JOIN students s ON s.id=a.student_id
    LEFT JOIN courses c ON c.id=a.course_id
    ORDER BY a.date DESC, a.time DESC
  `).all();

  const escape = v => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const csv = [
    ["Student ID","Name","Class","Course","Date","Time","Status","Method"],
    ...rows.map(r => [r.student_id,r.name,r.class_name,r.course,r.date,r.time,r.status,r.method])
  ].map(row => row.map(escape).join(",")).join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="attendance.csv"');
  res.send(csv);
});

app.get("*splat", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Attendance system running at http://localhost:${PORT}`);
});
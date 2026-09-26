let students = [];
let scanner = null;
let scannerStarted = false;

const $ = id => document.getElementById(id);

async function api(url, options={}) {
  const res = await fetch(url, {headers: {"Content-Type":"application/json"}, ...options});
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function init() {
  const me = await api("/api/me");
  if (me) showApp();
  $("loginForm").addEventListener("submit", login);
  document.querySelectorAll(".nav").forEach(b => b.addEventListener("click", () => showPage(b.dataset.page)));
  $("logout").addEventListener("click", async()=>{await api("/api/logout",{method:"POST"}); location.reload();});
  $("studentForm").addEventListener("submit", saveStudent);
  $("cancelEdit").addEventListener("click", resetStudentForm);
  $("studentSearch").addEventListener("input", renderStudents);
  $("loadReports").addEventListener("click", loadReports);
  $("exportCsv").addEventListener("click", ()=>location.href="/api/attendance/csv");
  $("loadManualStudents").addEventListener("click", loadManualAttendance);
  $("selectAllPresent").addEventListener("click", () => setAllManualChecks(true));
  $("clearAllPresent").addEventListener("click", () => setAllManualChecks(false));
  $("saveManualAttendance").addEventListener("click", saveManualAttendance);
}

async function login(e) {
  e.preventDefault();
  try {
    await api("/api/login",{method:"POST",body:JSON.stringify({
      username:$("username").value,password:$("password").value
    })});
    showApp();
  } catch(e) { alert(e.message); }
}

function showApp() {
  $("loginView").classList.add("hidden");
  $("app").classList.remove("hidden");
  showPage("dashboard");
}

async function showPage(page) {
  document.querySelectorAll(".page").forEach(p=>p.classList.add("hidden"));
  $(page).classList.remove("hidden");
  document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active", b.dataset.page===page));
  $("pageTitle").textContent = page.charAt(0).toUpperCase()+page.slice(1);
  if(page==="dashboard") loadDashboard();
  if(page==="students") loadStudents();
  if(page==="scanner") setupScanner();
  if(page==="manual") setupManualPage();
  if(page==="reports") loadReports();
}

async function loadDashboard() {
  try {
    const d = await api("/api/dashboard");
    $("totalStudents").textContent=d.totalStudents;
    $("presentToday").textContent=d.presentToday;
    $("totalAttendance").textContent=d.totalAttendance;
    $("courseCount").textContent=d.courses;
  } catch(e) { console.error(e); }
}

async function loadStudents() {
  students = await api("/api/students");
  renderStudents();
}

function renderStudents() {
  const q = $("studentSearch").value.toLowerCase();
  const rows = students.filter(s =>
    `${s.student_id} ${s.name} ${s.class_name} ${s.email}`.toLowerCase().includes(q)
  );
  $("studentsTable").innerHTML = rows.map(s=>`
    <tr>
      <td>${esc(s.student_id)}</td><td>${esc(s.name)}</td><td>${esc(s.class_name)}</td><td>${esc(s.email)}</td>
      <td class="actions">
        <button onclick="showQR('${encodeURIComponent(s.student_id)}')">QR</button>
        <button class="secondary" onclick="editStudent(${s.id})">Edit</button>
        <button style="background:#dc2626" onclick="deleteStudent(${s.id})">Delete</button>
      </td>
    </tr>`).join("");
}

async function saveStudent(e) {
  e.preventDefault();
  const id=$("editId").value;
  const body={
    studentId:$("studentId").value.trim(),
    name:$("studentName").value.trim(),
    email:$("studentEmail").value.trim(),
    phone:$("studentPhone").value.trim(),
    className:$("className").value.trim()
  };
  try {
    await api(id?`/api/students/${id}`:"/api/students",{method:id?"PUT":"POST",body:JSON.stringify(body)});
    resetStudentForm(); await loadStudents(); alert("Student saved.");
  } catch(e){alert(e.message);}
}

function editStudent(id) {
  const s=students.find(x=>x.id===id); if(!s)return;
  $("editId").value=s.id;$("studentId").value=s.student_id;$("studentName").value=s.name;
  $("studentEmail").value=s.email;$("studentPhone").value=s.phone;$("className").value=s.class_name;
  window.scrollTo({top:0,behavior:"smooth"});
}

async function deleteStudent(id) {
  if(!confirm("Delete this student? Attendance records will also be removed."))return;
  try{await api(`/api/students/${id}`,{method:"DELETE"});loadStudents();}catch(e){alert(e.message);}
}

function resetStudentForm() {
  $("studentForm").reset();$("editId").value="";
}

async function showQR(studentId) {
  try {
    const data=await api(`/api/students/${studentId}/qr`);
    const w=window.open("","QR Code","width=420,height=520");
    w.document.write(`<title>Student QR</title><style>body{text-align:center;font-family:Arial}img{max-width:350px}</style><h2>Student QR Code</h2><img src="${data.dataUrl}"><p>${decodeURIComponent(studentId)}</p><button onclick="window.print()">Print</button>`);
  }catch(e){alert(e.message);}
}

async function setupScanner() {
  const courses=await api("/api/courses");
  $("courseSelect").innerHTML=courses.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");
  if (scannerStarted || typeof Html5Qrcode==="undefined") return;
  scanner = new Html5Qrcode("reader");
  try {
    await scanner.start({facingMode:"environment"},{fps:10,qrbox:{width:250,height:250}},onScan);
    scannerStarted=true;
  } catch(e) {
    $("scanResult").className="result error";
    $("scanResult").textContent="Camera could not start: "+e;
  }
}

let lastScan="";
let lastScanTime=0;
async function onScan(decodedText) {
  const now=Date.now();
  if(decodedText===lastScan && now-lastScanTime<3000)return;
  lastScan=decodedText;lastScanTime=now;
  try {
    const result=await api("/api/attendance/scan",{method:"POST",body:JSON.stringify({
      qr:decodedText,courseId:$("courseSelect").value
    })});
    $("scanResult").className="result success";
    $("scanResult").textContent=`✓ ${result.student.name} marked Present at ${new Date().toLocaleTimeString()}`;
  }catch(e){
    $("scanResult").className="result error";
    $("scanResult").textContent=e.message;
  }
}


let manualStudents = [];

async function setupManualPage() {
  const courses = await api("/api/courses");
  $("manualCourseSelect").innerHTML =
    courses.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");

  if (!$("manualDate").value) {
    $("manualDate").value = new Date().toISOString().slice(0, 10);
  }
  await loadManualAttendance();
}

async function loadManualAttendance() {
  const date = $("manualDate").value;
  const courseId = $("manualCourseSelect").value;
  if (!courseId || !date) return;

  manualStudents = await api("/api/students");

  // Load existing records so the teacher can edit today's attendance.
  const records = await api(
    `/api/attendance?date=${encodeURIComponent(date)}&courseId=${encodeURIComponent(courseId)}`
  );
  const presentIds = new Set(
    records.filter(r => r.status === "Present").map(r => String(r.studentCode))
  );

  $("manualStudentsTable").innerHTML = manualStudents.map(s => `
    <tr>
      <td><input class="manual-check" type="checkbox"
          data-student-id="${s.id}"
          ${presentIds.has(String(s.student_id)) ? "checked" : ""}></td>
      <td>${esc(s.student_id)}</td>
      <td>${esc(s.name)}</td>
      <td>${esc(s.class_name)}</td>
    </tr>
  `).join("");

  document.querySelectorAll(".manual-check").forEach(c =>
    c.addEventListener("change", updateManualCount)
  );
  updateManualCount();
  $("manualResult").textContent = "";
  $("manualResult").className = "result";
}

function updateManualCount() {
  const count = document.querySelectorAll(".manual-check:checked").length;
  $("manualCount").textContent = `${count} present`;
}

function setAllManualChecks(value) {
  document.querySelectorAll(".manual-check").forEach(c => c.checked = value);
  updateManualCount();
}

async function saveManualAttendance() {
  const courseId = $("manualCourseSelect").value;
  const date = $("manualDate").value;
  const presentStudentIds = [...document.querySelectorAll(".manual-check:checked")]
    .map(c => Number(c.dataset.studentId));

  if (!courseId || !date) {
    alert("Please select a course and date.");
    return;
  }

  try {
    const result = await api("/api/attendance/manual", {
      method: "POST",
      body: JSON.stringify({ courseId, date, presentStudentIds })
    });

    $("manualResult").className = "result success";
    $("manualResult").textContent =
      `✓ Attendance saved. ${presentStudentIds.length} student(s) marked Present.`;
    await loadDashboard();
    await loadManualAttendance();
  } catch (e) {
    $("manualResult").className = "result error";
    $("manualResult").textContent = e.message;
  }
}

async function loadReports() {
  const date=$("reportDate").value;
  const rows=await api(date?`/api/attendance?date=${encodeURIComponent(date)}`:"/api/attendance");
  $("reportsTable").innerHTML=rows.map(r=>`
    <tr><td>${esc(r.studentCode)}</td><td>${esc(r.name)}</td><td>${esc(r.class_name)}</td>
    <td>${esc(r.course||"")}</td><td>${r.date}</td><td>${r.time}</td><td>${esc(r.status)}</td><td>${esc(r.method||"QR")}</td></tr>
  `).join("");
}

function esc(v) {
  return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

window.addEventListener("DOMContentLoaded",init);
window.editStudent=editStudent;window.deleteStudent=deleteStudent;window.showQR=showQR;
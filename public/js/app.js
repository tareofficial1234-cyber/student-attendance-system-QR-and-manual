let students=[],sections=[],scanner=null,scannerStarted=false,manualStudents=[];
const $=id=>document.getElementById(id);
async function api(url,options={}){const r=await fetch(url,{headers:{"Content-Type":"application/json"},...options});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"Request failed");return d}
async function init(){
 const me=await api("/api/me"); if(me) showApp(me);
 $("loginForm").addEventListener("submit",login); document.querySelectorAll(".nav").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
 $("logout").onclick=async()=>{await api("/api/logout",{method:"POST"});location.reload()};
 if($("startCamera"))$("startCamera").onclick=startCamera; if($("stopCamera"))$("stopCamera").onclick=stopCamera;
 $("studentForm").onsubmit=saveStudent;$("cancelEdit").onclick=resetStudentForm;$("studentSearch").oninput=renderStudents;
 $("loadReports").onclick=loadReports;$("exportCsv").onclick=()=>location.href="/api/attendance/csv";
 $("loadManualStudents").onclick=loadManualAttendance;$("selectAllPresent").onclick=()=>setAllManualChecks(true);$("clearAllPresent").onclick=()=>setAllManualChecks(false);$("saveManualAttendance").onclick=saveManualAttendance;
 $("sectionForm").onsubmit=createSection;$("userForm").onsubmit=createAccount;$("courseForm").onsubmit=createCourse;
}
async function login(e){e.preventDefault();try{const me=await api("/api/login",{method:"POST",body:JSON.stringify({email:$("email").value,password:$("password").value})});showApp(me)}catch(e){alert(e.message)}}
function showApp(me){window.currentUser=me;$("loginView").classList.add("hidden");$("app").classList.remove("hidden");$("userBadge").innerHTML=`<b>${esc(me.role==="admin"?"Administrator":"Teacher — "+(me.section_name||"Section"))}</b><small>${esc(me.email)}</small>`;document.querySelectorAll(".admin-only").forEach(x=>x.classList.toggle("hidden",me.role!=="admin"));showPage("dashboard")}
async function showPage(page){if(page!=="scanner") stopCamera(); document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));$(page).classList.remove("hidden");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===page));$("pageTitle").textContent=page==="sections"?"Sections & Accounts":page.charAt(0).toUpperCase()+page.slice(1);if(page==="dashboard")loadDashboard();if(page==="students")loadStudents();if(page==="scanner")setupScanner();if(page==="manual")setupManualPage();if(page==="reports")loadReports();if(page==="sections")loadSections();if(page==="courses")loadCourses()}
async function loadDashboard(){try{const d=await api("/api/dashboard");$("totalStudents").textContent=d.totalStudents;$("presentToday").textContent=d.presentToday;$("totalAttendance").textContent=d.totalAttendance;$("sectionCount").textContent=d.sections}catch(e){}}
async function loadSections(){sections=await api("/api/sections");const opts=sections.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("");$("studentSection").innerHTML=opts;$("accountSection").innerHTML=opts;$("courseSection").innerHTML=`<option value="">All / general</option>`+opts;$("sectionsList").innerHTML=sections.map(s=>`<div class="section-card"><b>${esc(s.name)}</b><span>${esc(s.description||"")}</span></div>`).join("");const users=await api("/api/users");$("usersTable").innerHTML=users.map(u=>`<tr><td>${esc(u.email)}</td><td>${esc(u.section_name||"All sections")}</td><td>${u.role==="admin"?"Administrator":"Teacher"}</td><td>${u.role==="admin"?"Protected":`<button class="secondary" onclick="resetAccount(${u.id},'${encodeURIComponent(u.email)}',${u.section_id})">Reset Email/Password</button> <button class="danger" onclick="removeAccount(${u.id})">Remove</button>`}</td></tr>`).join("")}
async function createSection(e){e.preventDefault();try{await api("/api/sections",{method:"POST",body:JSON.stringify({name:$("sectionName").value,description:$("sectionDescription").value})});e.target.reset();await loadSections();alert("Section created.")}catch(e){alert(e.message)}}
async function createAccount(e){e.preventDefault();try{await api("/api/users",{method:"POST",body:JSON.stringify({email:$("sectionEmail").value,password:$("sectionPassword").value,sectionId:$("accountSection").value})});e.target.reset();await loadSections();alert("Section login created.")}catch(e){alert(e.message)}}
async function resetAccount(id,emailEncoded,sectionId){
 const email=prompt("Teacher email:",decodeURIComponent(emailEncoded)); if(email===null)return;
 const password=prompt("New password (6+ characters):"); if(password===null)return;
 try{await api("/api/users/"+id,{method:"PUT",body:JSON.stringify({email,password,sectionId})});await loadSections();alert("Teacher account updated.")}catch(e){alert(e.message)}
}
async function removeAccount(id){if(!confirm("Remove this section account?"))return;try{await api("/api/users/"+id,{method:"DELETE"});loadSections()}catch(e){alert(e.message)}}
async function loadStudents(){students=await api("/api/students");renderStudents();if(window.currentUser?.role==="admin")await loadSections()}
function renderStudents(){
 const q=$("studentSearch").value.toLowerCase();
 $("studentsTable").innerHTML=students.filter(s=>`${s.student_id} ${s.name} ${s.school_name} ${s.class_name} ${s.email} ${s.phone} ${s.section_name}`.toLowerCase().includes(q)).map(s=>{
   const edit=window.currentUser?.role==="admin" ? `<button class="secondary" onclick="editStudent(${s.id})">Edit</button>` : `<span class="hint">View only</span>`;
   return `<tr><td>${esc(s.student_id)}</td><td>${esc(s.name)}</td><td>${esc(s.school_name)}</td><td>${esc(s.section_name||"")}</td><td>${esc(s.class_name)}</td><td>${esc(s.phone)}<br>${esc(s.email)}</td><td><button onclick="showQR('${encodeURIComponent(s.student_id)}')">QR</button></td><td>${edit}</td></tr>`;
 }).join("");
}
async function saveStudent(e){e.preventDefault();const id=$("editId").value;const body={studentId:$("studentId").value.trim(),name:$("studentName").value.trim(),schoolName:$("schoolName").value.trim(),email:$("studentEmail").value.trim(),phone:$("studentPhone").value.trim(),className:$("className").value.trim(),sectionId:$("studentSection").value};try{await api(id?"/api/students/"+id:"/api/students",{method:id?"PUT":"POST",body:JSON.stringify(body)});resetStudentForm();await loadStudents();alert("Student saved. QR is ready.");}catch(e){alert(e.message)}}
function editStudent(id){const s=students.find(x=>x.id===id);if(!s)return;$("editId").value=s.id;$("studentId").value=s.student_id;$("studentName").value=s.name;$("schoolName").value=s.school_name;$("studentEmail").value=s.email;$("studentPhone").value=s.phone;$("className").value=s.class_name;if(!$("studentSection").classList.contains("hidden"))$("studentSection").value=s.section_id||"";window.scrollTo({top:0,behavior:"smooth"})}
function resetStudentForm(){$("studentForm").reset();$("editId").value=""}
async function showQR(code){try{const d=await api("/api/students/"+code+"/qr");const w=window.open("","QR","width=500,height=650");w.document.write(`<title>Project Mercy Student QR</title><style>body{text-align:center;font-family:Arial;padding:25px}img{width:350px}.id{font-size:24px;font-weight:bold}</style><img src="${d.dataUrl}"><h2>${esc(d.student.name)}</h2><div class="id">${esc(d.student.student_id)}</div><p>${esc(d.student.school_name)}<br>${esc(d.student.section_name||"")}</p><button onclick="print()">Print</button>`)}catch(e){alert(e.message)}}
async function setupScanner(){
  const courses=await api("/api/courses");
  $("courseSelect").innerHTML=courses.map(c=>`<option value="${c.id}">${esc(c.name)}${c.section_name?" — "+esc(c.section_name):""}</option>`).join("");
  if(typeof Html5Qrcode==="undefined"){
    $("scanResult").className="result error";
    $("scanResult").textContent="QR camera library did not load. Check your internet connection and reload the page.";
    return;
  }
  if(!scanner) scanner=new Html5Qrcode("reader");
  try{
    const cameras=await Html5Qrcode.getCameras();
    $("cameraSelect").innerHTML=cameras.length
      ? cameras.map((c,i)=>`<option value="${esc(c.id)}">${esc(c.label||`Camera ${i+1}`)}</option>`).join("")
      : `<option value="">No camera found</option>`;
    if(cameras.length && !$("cameraSelect").value){
      const rear=cameras.find(c=>/back|rear|environment|world/i.test(c.label||""));
      $("cameraSelect").value=(rear||cameras[0]).id;
    }
  }catch(e){
    $("scanResult").className="result error";
    $("scanResult").textContent="Camera permission/device error: "+(e?.message||e)+". Make sure this page is HTTPS and allow camera access.";
  }
}
async function startCamera(){
  if(scannerStarted)return;
  if(typeof Html5Qrcode==="undefined"){await setupScanner();if(typeof Html5Qrcode==="undefined")return;}
  const selected=$("cameraSelect").value;
  const config={fps:10,qrbox:{width:250,height:250},aspectRatio:1.0,rememberLastUsedCamera:true};
  try{
    await scanner.start(selected?selected:{facingMode:{ideal:"environment"}},config,onScan);
    scannerStarted=true;
    $("scanResult").className="result success";
    $("scanResult").textContent="✓ Camera started. Point it at the student's QR code.";
  }catch(first){
    try{
      await scanner.start({facingMode:"environment"},config,onScan);
      scannerStarted=true;
      $("scanResult").className="result success";
      $("scanResult").textContent="✓ Rear camera started. Point it at the student's QR code.";
    }catch(second){
      $("scanResult").className="result error";
      $("scanResult").textContent="Camera could not start. Allow camera permission, use HTTPS, and try selecting another camera. "+(second?.message||second);
    }
  }
}
async function stopCamera(){
  if(!scanner||!scannerStarted)return;
  try{await scanner.stop();scanner.clear();}catch(e){}
  scannerStarted=false;
}
let lastScan="",lastScanTime=0;async function onScan(text){const now=Date.now();if(text===lastScan&&now-lastScanTime<3000)return;lastScan=text;lastScanTime=now;try{const r=await api("/api/attendance/scan",{method:"POST",body:JSON.stringify({qr:text,courseId:$("courseSelect").value})});$("scanResult").className="result success";$("scanResult").textContent=`✓ ${r.student.name} marked Present`;loadDashboard()}catch(e){$("scanResult").className="result error";$("scanResult").textContent=e.message}}
async function setupManualPage(){const c=await api("/api/courses");$("manualCourseSelect").innerHTML=c.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("");if(!$("manualDate").value)$("manualDate").value=new Date().toISOString().slice(0,10);loadManualAttendance()}
async function loadManualAttendance(){const date=$("manualDate").value,cid=$("manualCourseSelect").value;if(!date||!cid)return;manualStudents=await api("/api/students");const records=await api(`/api/attendance?date=${date}&courseId=${cid}`),present=new Set(records.filter(x=>x.status==="Present").map(x=>x.studentCode));$("manualStudentsTable").innerHTML=manualStudents.map(s=>`<tr><td><input class="manual-check" type="checkbox" data-student-id="${s.id}" ${present.has(s.student_id)?"checked":""}></td><td>${esc(s.student_id)}</td><td>${esc(s.name)}</td><td>${esc(s.school_name)}</td><td>${esc(s.class_name)}</td></tr>`).join("");document.querySelectorAll(".manual-check").forEach(x=>x.onchange=updateManualCount);updateManualCount()}
function updateManualCount(){$("manualCount").textContent=`${document.querySelectorAll(".manual-check:checked").length} present`}
function setAllManualChecks(v){document.querySelectorAll(".manual-check").forEach(x=>x.checked=v);updateManualCount()}
async function saveManualAttendance(){const courseId=$("manualCourseSelect").value,date=$("manualDate").value,presentStudentIds=[...document.querySelectorAll(".manual-check:checked")].map(x=>Number(x.dataset.studentId));try{await api("/api/attendance/manual",{method:"POST",body:JSON.stringify({courseId,date,presentStudentIds})});$("manualResult").className="result success";$("manualResult").textContent="✓ Manual attendance saved.";loadDashboard()}catch(e){$("manualResult").className="result error";$("manualResult").textContent=e.message}}
async function loadReports(){const date=$("reportDate").value;const r=await api(date?"/api/attendance?date="+date:"/api/attendance");$("reportsTable").innerHTML=r.map(x=>`<tr><td>${esc(x.studentCode)}</td><td>${esc(x.name)}</td><td>${esc(x.school_name)}</td><td>${esc(x.section_name||"")}</td><td>${esc(x.course||"")}</td><td>${x.date}</td><td>${x.time}</td><td>${esc(x.status)}</td><td>${esc(x.method)}</td></tr>`).join("")}
async function loadCourses(){const c=await api("/api/courses");$("coursesTable").innerHTML=c.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.section_name||"All")}</td></tr>`).join("")}
async function createCourse(e){e.preventDefault();try{await api("/api/courses",{method:"POST",body:JSON.stringify({name:$("courseName").value,sectionId:$("courseSection").value})});e.target.reset();loadCourses();alert("Course created.")}catch(e){alert(e.message)}}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
window.addEventListener("DOMContentLoaded",async()=>{window.currentUser=await api("/api/me");init()});window.editStudent=editStudent;window.showQR=showQR;window.removeAccount=removeAccount;window.resetAccount=resetAccount;

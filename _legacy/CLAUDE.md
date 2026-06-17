# CLAUDE.md — Complaint Tracker

## Project Overview
ระบบติดตาม Customer Complaint สำหรับ Forth Smart Service
Tech: Node.js + Express + SQLite + Vanilla JS

---

## Prompt Log (5 รายการสำคัญ)

### 1. Prompt: ออกแบบ Database Schema
```
สร้าง SQLite schema สำหรับระบบ complaint tracking ที่มี:
- ตาราง cases: เก็บข้อมูล case, สถานะ, priority, assignee
- ตาราง notes: เก็บ history การอัปเดตของแต่ละ case
ให้รองรับ auto-generate case number แบบ CST202506XXXX
```
**เหตุผล:** ระบุ requirement ให้ชัดทั้ง structure และ business rule (case number format) เพื่อให้ Claude ออกแบบ schema ได้ตรงความต้องการในครั้งเดียว

---

### 2. Prompt: สร้าง Express REST API
```
เขียน Express.js API server ที่มี endpoints:
- GET /api/cases (รองรับ filter: status, priority, search)
- POST /api/cases (validate required fields)
- PATCH /api/cases/:id (update status/assignee)
- POST /api/cases/:id/notes
- DELETE /api/cases/:id
ใช้ better-sqlite3, ไม่ใช้ ORM, ส่ง error response ที่มีความหมาย
```
**เหตุผล:** ระบุ library ที่ต้องการ, บอก constraint (ไม่ใช้ ORM), และ list endpoints ให้ครบ ทำให้ Claude ไม่ต้องเดาและไม่ผิดทิศ

---

### 3. Prompt: สร้าง Frontend Single-Page
```
สร้าง HTML/CSS/JS ไฟล์เดียว (ไม่ใช้ framework) สำหรับ complaint tracking ที่มี:
- Dashboard stats (จำนวน case แต่ละสถานะ)
- ตารางรายการ case พร้อม search/filter
- Modal ฟอร์มสร้าง case
- Side panel แสดงรายละเอียด + note history
- Badge สีตาม status และ priority
ใช้ Fetch API เรียก backend ที่ localhost:3000
```
**เหตุผล:** รวม requirement ทั้งหมดในครั้งเดียว ระบุ constraint (ไฟล์เดียว, ไม่ใช้ framework) และ API URL ที่ต้องเรียก

---

### 4. Prompt: สร้าง Test Cases
```
เขียน Node.js test script สำหรับ API ของ complaint tracker:
- Happy path: สร้าง case, อ่าน case, อัปเดตสถานะ
- Edge case: สร้าง case โดยไม่ส่ง required field
- Edge case: อัปเดต case ที่ไม่มีอยู่ใน database
ทดสอบโดยใช้ fetch เรียก API จริง, แสดงผล PASS/FAIL
```
**เหตุผล:** บอกให้ครอบคลุมทั้ง happy path และ edge case ตามโจทย์ Final Project, ระบุว่าใช้ fetch (ไม่ต้องติดตั้ง testing library เพิ่ม)

---

### 5. Prompt: สร้าง Security Report
```
วิเคราะห์ security ของ Express.js complaint tracker ที่มี:
- SQLite database
- REST API ไม่มี authentication
- Frontend HTML ส่งข้อมูลด้วย fetch
สร้างเป็น security-report.html ที่แสดง vulnerabilities แต่ละข้อ
พร้อม severity (Critical/High/Medium/Low), สาเหตุ, และวิธีแก้ไข
```
**เหตุผล:** ให้ context ของระบบก่อน แล้วระบุ output format และ structure ที่ต้องการ ทำให้ Claude วิเคราะห์ได้ตรงจุดและ output ออกมา structured

---

## Custom Skill: `seed-test-data`

### วัตถุประสงค์
สร้าง test data จำลองสำหรับ complaint cases เพื่อทดสอบ UI และ demo ได้ทันที โดยไม่ต้องกรอก form ด้วยมือทีละ case

### ไฟล์: `.claude/commands/seed-test-data.md`
```markdown
# Seed Test Data

เรียก API POST /api/cases เพื่อสร้าง complaint cases ตัวอย่าง 5 รายการ
ที่ครอบคลุมสถานะ (Open, In Progress, Resolved) และ priority (Critical, High, Medium, Low)

\`\`\`bash
node -e "
const cases = [
  { customer_name: 'บริษัท ABC จำกัด', category: 'สินค้าชำรุด', priority: 'Critical', subject: 'อุปกรณ์ไม่สามารถเปิดใช้งานได้', assignee: 'สมชาย' },
  { customer_name: 'คุณมานี', category: 'บริการล่าช้า', priority: 'High', subject: 'รอช่างนานกว่า 3 วัน', assignee: 'สมหญิง' },
  { customer_name: 'ร้านค้า XYZ', category: 'การเรียกเก็บเงิน', priority: 'Medium', subject: 'ถูกเรียกเก็บเงินซ้ำ', assignee: 'วิชัย' },
  { customer_name: 'คุณอนุชา', category: 'คำถามด้านเทคนิค', priority: 'Low', subject: 'ขอคู่มือการใช้งาน', assignee: '' },
  { customer_name: 'บริษัท DEF', category: 'อื่นๆ', priority: 'High', subject: 'ต้องการยกเลิกสัญญา', assignee: 'สมชาย' },
];
Promise.all(cases.map(c => fetch('http://localhost:3000/api/cases', {
  method: 'POST',
  headers: {'Content-Type':'application/json'},
  body: JSON.stringify(c)
}))).then(() => console.log('Seeded 5 cases!'));
"
\`\`\`
```

### ช่วยแก้ปัญหาอะไร
เวลา demo หรือทดสอบ UI ใหม่ ไม่ต้องกรอกข้อมูลทีละ case — รัน skill นี้ครั้งเดียวได้ข้อมูลครบพร้อม demo

---

## Lesson Learned

- **Prompt ที่ดี** ต้องระบุ constraint และ library ที่ต้องการ ไม่ใช่แค่บอก feature
- **Single-file frontend** ง่ายต่อการ deploy และไม่ต้องใช้ build tool
- **better-sqlite3** เหมาะกับโปรเจกต์ขนาดเล็กที่ไม่ต้องการ async complexity

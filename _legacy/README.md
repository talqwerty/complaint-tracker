# 📋 Complaint Tracker

ระบบติดตาม Customer Complaint สำหรับ Forth Smart Service พัฒนาด้วย Claude Code

## ปัญหาที่แก้ไข

ทีมต้องการระบบกลางสำหรับรับแจ้งและติดตาม complaint ของลูกค้า แทนการใช้ Excel หรือ Chat ที่ทำให้ข้อมูลกระจาย ไม่สามารถ assign ผู้รับผิดชอบและ track สถานะได้ง่าย

## Features

- ✅ สร้าง Case พร้อม priority (Critical / High / Medium / Low)
- ✅ ติดตามสถานะ: Open → In Progress → Resolved → Closed
- ✅ Assign ผู้รับผิดชอบแต่ละ Case
- ✅ เพิ่ม Note/บันทึกการแก้ไขใน Case
- ✅ Dashboard สรุปจำนวน Case แต่ละสถานะ
- ✅ ค้นหาและ filter ตามสถานะ / priority
- ✅ Auto-generate Case Number (CST202506XXXX)
- ✅ ข้อมูลเก็บใน SQLite ถาวร

## วิธีติดตั้งและรัน

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. Start server
npm start

# 3. เปิด Browser ที่
http://localhost:3000
```

## Tech Stack

| Layer    | Technology            |
|----------|-----------------------|
| Frontend | HTML / CSS / JavaScript (Vanilla) |
| Backend  | Node.js + Express     |
| Database | SQLite (better-sqlite3) |

## โครงสร้างไฟล์

```
complaint-tracker/
├── server.js          # Express API server
├── complaints.db      # SQLite database (auto-created)
├── package.json
├── public/
│   └── index.html    # Frontend UI
├── tests/
│   └── test.js       # Test cases
├── CLAUDE.md         # Prompt log & development notes
└── security-report.html
```

## API Endpoints

| Method | Path                     | Description         |
|--------|--------------------------|---------------------|
| GET    | /api/cases               | รายการ Case ทั้งหมด |
| GET    | /api/cases/stats         | สรุปสถิติ           |
| GET    | /api/cases/:id           | รายละเอียด Case     |
| POST   | /api/cases               | สร้าง Case ใหม่     |
| PATCH  | /api/cases/:id           | อัปเดต Case         |
| POST   | /api/cases/:id/notes     | เพิ่ม Note          |
| DELETE | /api/cases/:id           | ลบ Case             |

## ตัวอย่างการใช้งาน

1. กด **"+ สร้าง Case ใหม่"** → กรอกข้อมูลลูกค้าและปัญหา
2. คลิก Case ในตาราง → เปิด Panel รายละเอียด
3. เปลี่ยนสถานะได้จาก Dropdown ในหน้า Detail
4. เพิ่มบันทึกการแก้ไขในช่อง Note

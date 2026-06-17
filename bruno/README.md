# Complaint Tracker — Bruno collection

Bruno API collection สำหรับ NestJS API (`apps/api`). แต่ละ `.bru` = 1 request.

## เปิดใช้

1. ติดตั้ง [Bruno](https://www.usebruno.com/) (desktop app)
2. **Open Collection** → เลือกโฟลเดอร์ `bruno/` นี้
3. เลือก environment **Local** (มุมขวาบน) — `baseUrl = http://localhost:3001/api`
4. รัน API ก่อน: `pnpm dev:api` (หรือ `pnpm dev`)

## Auth + chaining

ทุก `/cases*` ต้องมี JWT. `Login` (seq 0) capture token → `{{token}}`,
collection แนบ `Authorization: Bearer {{token}}` ให้ทุก request อัตโนมัติ (ดู `collection.bru`).
`Create Case` (seq 3) capture `id` → `{{caseId}}` ให้ `Get / Add Note / Update / Delete` ใช้ต่อ.

รันเรียงตาม seq ได้เลย (Login ต้องรันก่อน).

| seq | request | method | path |
| --- | ------- | ------ | ---- |
| 0 | Login | POST | `/auth/login` → `{{token}}` |
| 1 | List Cases | GET | `/cases` |
| 2 | Get Stats | GET | `/cases/stats` |
| 3 | Create Case | POST | `/cases` |
| 4 | Get Case | GET | `/cases/{{caseId}}` |
| 5 | Add Note | POST | `/cases/{{caseId}}/notes` |
| 6 | Update Case | PATCH | `/cases/{{caseId}}` |
| 7 | Delete Case | DELETE | `/cases/{{caseId}}` |
| 8 | Create Case (Validation Error) | POST | `/cases` → 400 |

## รันทั้ง collection แบบ CLI

```bash
npx @usebruno/cli run --env Local
```

## Export ไปฟอร์แมตอื่น

ใน Bruno app:
- **... (collection menu) → Export** → Bruno / Postman / OpenAPI
- หรือ **Share → Generate code** สำหรับ snippet แต่ละ request

> เพิ่ม request ใหม่: สร้างไฟล์ `.bru` เพิ่มในโฟลเดอร์นี้ หรือสร้างผ่าน Bruno app แล้วจะ generate ไฟล์ให้อัตโนมัติ.

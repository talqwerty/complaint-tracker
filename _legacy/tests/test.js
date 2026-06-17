/**
 * Test Cases — Complaint Tracker API
 * รัน: node tests/test.js (ต้อง start server ก่อน)
 */

const BASE = 'http://localhost:3000/api';
let createdId = null;
let passed = 0, failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { status: r.status, data: await r.json() };
}

async function get(path) {
  const r = await fetch(`${BASE}${path}`);
  return { status: r.status, data: await r.json() };
}

async function patch(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { status: r.status, data: await r.json() };
}

// ===================================================
// TEST CASE 1: Happy Path — สร้าง Case และอ่านข้อมูล
// ===================================================
async function test1_createAndRead() {
  console.log('\n📋 Test 1: Happy Path — สร้าง Case และอ่านข้อมูล');

  // 1a. สร้าง case
  const { status, data } = await post('/cases', {
    customer_name: 'บริษัท ทดสอบ จำกัด',
    customer_contact: '02-111-2222',
    category: 'สินค้าชำรุด',
    priority: 'High',
    subject: 'สินค้าไม่ทำงานหลังรับของ',
    description: 'ลูกค้าได้รับสินค้าแล้วเปิดไม่ติด',
    assignee: 'สมชาย'
  });

  assert('POST /cases ตอบ 201', status === 201);
  assert('มี case_number ในรูปแบบ CST', data.case_number && data.case_number.startsWith('CST'));
  assert('status เริ่มต้นเป็น Open', data.status === 'Open');
  assert('priority ถูกบันทึก', data.priority === 'High');
  createdId = data.id;

  // 1b. อ่าน case ที่สร้าง
  const { status: s2, data: d2 } = await get(`/cases/${createdId}`);
  assert('GET /cases/:id ตอบ 200', s2 === 200);
  assert('customer_name ตรงกัน', d2.customer_name === 'บริษัท ทดสอบ จำกัด');
  assert('มี notes array', Array.isArray(d2.notes));

  // 1c. เพิ่ม note
  const { status: s3, data: d3 } = await post(`/cases/${createdId}/notes`, {
    author: 'สมชาย', content: 'รับ case แล้ว กำลังตรวจสอบ'
  });
  assert('POST note ตอบ 201', s3 === 201);
  assert('note มี content', d3.content === 'รับ case แล้ว กำลังตรวจสอบ');
}

// ===================================================
// TEST CASE 2: Happy Path — อัปเดตสถานะ Case
// ===================================================
async function test2_updateStatus() {
  console.log('\n🔄 Test 2: Happy Path — อัปเดตสถานะ Case');

  // อัปเดตสถานะเป็น In Progress
  const { status, data } = await patch(`/cases/${createdId}`, { status: 'In Progress' });
  assert('PATCH /cases/:id ตอบ 200', status === 200);
  assert('status อัปเดตเป็น In Progress', data.status === 'In Progress');

  // อัปเดตสถานะเป็น Resolved
  const { status: s2, data: d2 } = await patch(`/cases/${createdId}`, { status: 'Resolved' });
  assert('อัปเดตเป็น Resolved สำเร็จ', s2 === 200 && d2.status === 'Resolved');

  // ตรวจสอบใน list
  const { data: list } = await get('/cases?status=Resolved');
  const found = list.find(c => c.id === createdId);
  assert('Case ปรากฏใน filter Resolved', !!found);
}

// ===================================================
// TEST CASE 3: Edge Case — สร้าง Case โดยไม่ส่ง required field
// ===================================================
async function test3_missingRequiredFields() {
  console.log('\n⚠️  Test 3: Edge Case — Missing Required Fields');

  // 3a. ไม่ส่ง customer_name
  const { status: s1, data: d1 } = await post('/cases', {
    category: 'สินค้าชำรุด',
    subject: 'ทดสอบ'
  });
  assert('ขาด customer_name → ตอบ 400', s1 === 400);
  assert('มี error message', !!d1.error);

  // 3b. ไม่ส่ง subject
  const { status: s2 } = await post('/cases', {
    customer_name: 'คุณทดสอบ',
    category: 'อื่นๆ'
  });
  assert('ขาด subject → ตอบ 400', s2 === 400);

  // 3c. ส่ง body ว่างเปล่า
  const { status: s3 } = await post('/cases', {});
  assert('ส่ง body ว่าง → ตอบ 400', s3 === 400);

  // 3d. GET case ที่ไม่มีอยู่
  const { status: s4 } = await get('/cases/99999');
  assert('GET case ที่ไม่มี → ตอบ 404', s4 === 404);

  // 3e. PATCH case ที่ไม่มีอยู่
  const { status: s5 } = await patch('/cases/99999', { status: 'Closed' });
  assert('PATCH case ที่ไม่มี → ตอบ 404', s5 === 404);

  // 3f. PATCH โดยไม่ส่ง field ที่ valid
  const { status: s6 } = await patch(`/cases/${createdId}`, { invalid_field: 'xxx' });
  assert('PATCH field ที่ไม่ valid → ตอบ 400', s6 === 400);
}

// ===================================================
// Run All Tests
// ===================================================
async function runAll() {
  console.log('🧪 Complaint Tracker — API Test Suite');
  console.log('='.repeat(50));

  try {
    await test1_createAndRead();
    await test2_updateStatus();
    await test3_missingRequiredFields();
  } catch (e) {
    console.error('\n💥 Test Error:', e.message);
    console.error('ตรวจสอบว่า server รันอยู่ที่ localhost:3000');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 ผลลัพธ์: ✅ ${passed} PASS  ❌ ${failed} FAIL`);
  process.exit(failed > 0 ? 1 : 0);
}

runAll();

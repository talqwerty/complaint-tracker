import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const seedUsers = [
  { email: 'admin@forth.com', name: 'ผู้ดูแลระบบ', role: 'admin', password: 'password123' },
  { email: 'staff@forth.com', name: 'สมชาย', role: 'staff', password: 'password123' },
];

const seedCases = [
  { customerName: 'บริษัท ABC จำกัด', category: 'สินค้าชำรุด', priority: 'Critical', subject: 'อุปกรณ์ไม่สามารถเปิดใช้งานได้', assignee: 'สมชาย', status: 'Open' },
  { customerName: 'คุณมานี', category: 'บริการล่าช้า', priority: 'High', subject: 'รอช่างนานกว่า 3 วัน', assignee: 'สมหญิง', status: 'In Progress' },
  { customerName: 'ร้านค้า XYZ', category: 'การเรียกเก็บเงิน', priority: 'Medium', subject: 'ถูกเรียกเก็บเงินซ้ำ', assignee: 'วิชัย', status: 'Resolved' },
  { customerName: 'คุณอนุชา', category: 'คำถามด้านเทคนิค', priority: 'Low', subject: 'ขอคู่มือการใช้งาน', assignee: '', status: 'Open' },
  { customerName: 'บริษัท DEF', category: 'อื่นๆ', priority: 'High', subject: 'ต้องการยกเลิกสัญญา', assignee: 'สมชาย', status: 'In Progress' },
];

function genCaseNumber(seq: number): string {
  const d = new Date();
  const prefix = `CST${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

async function main() {
  await prisma.note.deleteMany();
  await prisma.case.deleteMany();
  await prisma.user.deleteMany();

  for (const u of seedUsers) {
    await prisma.user.create({
      data: { ...u, password: await bcrypt.hash(u.password, 10) },
    });
  }
  console.log(`Seeded ${seedUsers.length} users`);

  let seq = 1;
  for (const c of seedCases) {
    await prisma.case.create({
      data: { ...c, caseNumber: genCaseNumber(seq++) },
    });
  }
  console.log(`Seeded ${seedCases.length} cases`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

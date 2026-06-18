import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// No hard-coded default passwords. Each user's password comes from its env var
// (e.g. SEED_ADMIN_PASSWORD) or a freshly generated random one, printed once
// below so it can be recorded and rotated.
const seedUsers = [
  { email: 'admin@forth.com', name: 'ผู้ดูแลระบบ', role: 'admin', envKey: 'SEED_ADMIN_PASSWORD' },
  { email: 'staff@forth.com', name: 'สมชาย', role: 'staff', envKey: 'SEED_STAFF_PASSWORD' },
];

function generatePassword(): string {
  // ~16 chars, URL-safe, high entropy.
  return randomBytes(12).toString('base64url');
}

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

  const credentials: { email: string; password: string; generated: boolean }[] = [];
  for (const { envKey, ...u } of seedUsers) {
    const fromEnv = process.env[envKey];
    const password = fromEnv ?? generatePassword();
    await prisma.user.create({
      data: { ...u, password: await bcrypt.hash(password, 10) },
    });
    credentials.push({ email: u.email, password, generated: !fromEnv });
  }
  console.log(`Seeded ${seedUsers.length} users`);
  console.log('\n=== Seeded login credentials (record these now) ===');
  for (const c of credentials) {
    const note = c.generated ? '(generated)' : '(from env)';
    console.log(`  ${c.email}  ${c.password}  ${note}`);
  }
  console.log('Change these passwords after first login.\n');

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

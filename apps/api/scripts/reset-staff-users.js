/**
 * Dev-only: wipe staff users and recreate Super Admin + Admin with known passwords.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const fs = require('fs');

const prisma = new PrismaClient();

const SUPER = {
  email: 'superadmin@theglobalicon.local',
  username: 'superadmin',
  password: 'SuperAdmin123!',
  firstName: 'Super',
  lastName: 'Admin',
  role: 'SUPER_ADMIN',
};
const ADMIN = {
  email: 'admin@theglobalicon.local',
  username: 'admin',
  password: 'Admin123456!',
  firstName: 'Site',
  lastName: 'Admin',
  role: 'ADMIN',
};

async function upsertStaff(spec) {
  const role = await prisma.role.findUniqueOrThrow({ where: { name: spec.role } });
  const passwordHash = await bcrypt.hash(spec.password, 12);
  await prisma.user.deleteMany({
    where: { OR: [{ email: spec.email }, { username: spec.username }] },
  });
  return prisma.user.create({
    data: {
      email: spec.email,
      username: spec.username,
      passwordHash,
      firstName: spec.firstName,
      lastName: spec.lastName,
      isActive: true,
      roles: { create: [{ roleId: role.id }] },
    },
  });
}

(async () => {
  const before = await prisma.user.count();
  await prisma.refreshToken.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.savedContent.deleteMany({});
  await prisma.readingHistory.deleteMany({});
  await prisma.readerPreference.deleteMany({});
  await prisma.userRole.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('Deleted users:', before);

  const sa = await upsertStaff(SUPER);
  const ad = await upsertStaff(ADMIN);
  console.log('Created SUPER_ADMIN', sa.email);
  console.log('Created ADMIN', ad.email);

  let env = fs.readFileSync('.env', 'utf8').replace(/^\uFEFF/, '');
  const set = (key, val) => {
    const re = new RegExp('^' + key + '=.*$', 'm');
    if (re.test(env)) env = env.replace(re, key + '=' + val);
    else env += '\n' + key + '=' + val;
  };
  set('SUPER_ADMIN_EMAIL', SUPER.email);
  set('SUPER_ADMIN_USERNAME', SUPER.username);
  set('SUPER_ADMIN_PASSWORD', SUPER.password);
  fs.writeFileSync('.env', env);

  fs.writeFileSync('.superadmin-local.txt', [
    'THE GLOBAL ICON — local staff accounts (development only)',
    '',
    'Super Admin',
    '  Email/username: ' + SUPER.email + '  OR  ' + SUPER.username,
    '  Password: ' + SUPER.password,
    '',
    'Admin',
    '  Email/username: ' + ADMIN.email + '  OR  ' + ADMIN.username,
    '  Password: ' + ADMIN.password,
    '',
    'Login: http://localhost:4200/login',
  ].join('\n'));
  console.log('Wrote .superadmin-local.txt');
  await prisma.$disconnect();
})().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // Create users
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      passwordHash: passwordHash,
    },
  });

  const memberUser = await prisma.user.upsert({
    where: { email: 'member@example.com' },
    update: {},
    create: {
      email: 'member@example.com',
      name: 'Member User',
      role: 'member',
      passwordHash: passwordHash,
    },
  });
  
  await prisma.user.upsert({ where: { email: 'carol@example.com' }, update: {}, create: { email: 'carol@example.com', name: 'Carol Danvers', role: 'member', passwordHash: passwordHash }});
  await prisma.user.upsert({ where: { email: 'peter@example.com' }, update: {}, create: { email: 'peter@example.com', name: 'Peter Parker', role: 'member', passwordHash: passwordHash }});
  await prisma.user.upsert({ where: { email: 'tony@example.com' }, update: {}, create: { email: 'tony@example.com', name: 'Tony Stark', role: 'member', passwordHash: passwordHash }});


  console.log(`Upserted users`);

  // Delete existing credentials and create a new one
  await prisma.zoomCredentials.deleteMany({});
  await prisma.zoomCredentials.create({
    data: {
      clientId: 'DUMMY_CLIENT_ID',
      clientSecret: 'DUMMY_CLIENT_SECRET',
      accountId: 'DUMMY_ACCOUNT_ID',
      hostKey: '123456',
    },
  });
  
  console.log('Upserted zoom credentials');

  // Delete existing meetings to avoid duplicates on re-seed
  await prisma.meeting.deleteMany({});
  console.log('Deleted existing meetings');

  // Seed Settings jika belum ada
  const settingsCount = await prisma.settings.count();
  if (settingsCount === 0) {
    await prisma.settings.create({
      data: {
        allowRegistration: true,
        defaultRole: 'member',
      },
    });
    console.log('Seeded default settings');
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

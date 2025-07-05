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

  // Create Zoom accounts
  const zoom1 = await prisma.zoomAccount.upsert({
      where: { email: 'corp-zoom-1@example.com' },
      update: {},
      create: { email: 'corp-zoom-1@example.com' }
  });
  const zoom2 = await prisma.zoomAccount.upsert({
      where: { email: 'corp-zoom-2@example.com' },
      update: {},
      create: { email: 'corp-zoom-2@example.com' }
  });
  const zoom3 = await prisma.zoomAccount.upsert({
      where: { email: 'corp-zoom-3@example.com' },
      update: {},
      create: { email: 'corp-zoom-3@example.com' }
  });

  console.log('Upserted zoom accounts');

  // Delete existing meetings to avoid duplicates on re-seed
  await prisma.meeting.deleteMany({});
  console.log('Deleted existing meetings');

  // Create meetings
  await prisma.meeting.create({
    data: {
      title: 'Quarterly Business Review',
      date: new Date(new Date().setDate(new Date().getDate() + 3)),
      duration: 60,
      participants: 'ceo@example.com, cto@example.com',
      description: 'Review of Q3 performance and planning for Q4.',
      organizerId: adminUser.id,
      zoomAccountId: zoom1.id,
    },
  });

  await prisma.meeting.create({
    data: {
      title: 'Project Phoenix - Standup',
      date: new Date(new Date().setDate(new Date().getDate() + 1)),
      duration: 15,
      participants: 'member@example.com, dev1@example.com, dev2@example.com',
      organizerId: memberUser.id,
      zoomAccountId: zoom2.id,
    },
  });

  await prisma.meeting.create({
    data: {
      title: 'Marketing Strategy Session',
      date: new Date(new Date().setDate(new Date().getDate() + 5)),
      duration: 90,
      participants: 'marketing-head@example.com, admin@example.com',
      description: 'Brainstorming for next year\'s marketing campaigns.',
      organizerId: adminUser.id,
      zoomAccountId: zoom1.id,
    },
  });

  await prisma.meeting.create({
    data: {
        title: 'Past Meeting: Design Sync',
        date: new Date(new Date().setDate(new Date().getDate() - 2)),
        duration: 45,
        participants: 'designer1@example.com, designer2@example.com',
        organizerId: memberUser.id,
        zoomAccountId: zoom3.id,
    }
  });


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

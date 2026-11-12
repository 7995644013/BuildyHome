const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await argon2.hash('password123');

  // Super Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@buildyhome.com' },
    update: {},
    create: {
      email: 'admin@buildyhome.com',
      name: 'Super Admin',
      hashedPassword,
      role: 'super_admin',
      designation: 'System Administrator',
    },
  });

  // Client
  const client = await prisma.user.upsert({
    where: { email: 'client@example.com' },
    update: {},
    create: {
      email: 'client@example.com',
      name: 'Client User',
      hashedPassword,
      role: 'client',
      designation: 'Home Owner',
    },
  });

  // Project Manager
  const pm = await prisma.user.upsert({
    where: { email: 'pm@buildyhome.com' },
    update: {},
    create: {
      email: 'pm@buildyhome.com',
      name: 'Project Manager',
      hashedPassword,
      role: 'project_manager',
    },
  });

  // Project
  const project = await prisma.project.upsert({
     where: { referenceNumber: 'PROJ-001' },
     update: {},
     create: {
        name: 'Dream House',
        referenceNumber: 'PROJ-001',
        description: 'A beautiful dream house project',
        status: 'ACTIVE',
        projectManagerId: pm.id,
        clientId: client.id
     }
  });

  // Assign Client to Project
  await prisma.projectAssignment.create({
      data: {
          projectId: project.id,
          userId: client.id,
          role: 'client'
      }
  }).catch(() => {}); // Ignore if already exists (though upsert handled above mostly)

  console.log({ admin, client, pm, project });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://postgres:root%40123@localhost:5432/gitforge"
    }
  }
});

async function main() {
  console.log("Seeding Phase 22 Notifications test data...");

  // 1. Ensure users exist
  const appi = await prisma.user.upsert({
    where: { username: 'appi' },
    update: { notificationPreference: 'IMMEDIATE' },
    create: { username: 'appi', email: 'appi@example.com', passwordHash: 'test', notificationPreference: 'IMMEDIATE' }
  });

  const searchmember = await prisma.user.upsert({
    where: { username: 'searchmember' },
    update: { notificationPreference: 'IMMEDIATE' },
    create: { username: 'searchmember', email: 'searchmember@example.com', passwordHash: 'test', notificationPreference: 'IMMEDIATE' }
  });

  const muteduser = await prisma.user.upsert({
    where: { username: 'muteduser' },
    update: { notificationPreference: 'OFF' },
    create: { username: 'muteduser', email: 'muteduser@example.com', passwordHash: 'test', notificationPreference: 'OFF' }
  });

  // 2. Clear old data
  await prisma.notification.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.issue.deleteMany({});
  await prisma.pullRequest.deleteMany({});
  await prisma.repository.deleteMany({});

  // 3. Create Repo
  const repo = await prisma.repository.create({
    data: {
      name: "notifications-test-repo",
      isPrivate: false,
      ownerId: appi.id
    }
  });

  // 4. Create Issue
  const issue = await prisma.issue.create({
    data: {
      number: 1,
      title: "notifications-test-issue",
      body: "Test issue for notifications",
      status: "OPEN",
      creatorId: appi.id,
      repositoryId: repo.id,
      assignees: { connect: { id: searchmember.id } }
    }
  });

  // 5. Create PR
  const pr = await prisma.pullRequest.create({
    data: {
      number: 2,
      title: "notifications-test-pr",
      body: "Test pull request for notifications",
      status: "OPEN",
      baseBranch: "main",
      compareBranch: "patch",
      creatorId: appi.id,
      repositoryId: repo.id
    }
  });

  console.log("Seeding notifications-test completed successfully!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

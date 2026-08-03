const { prisma } = require('@gitforge/database');

async function runAudit() {
  console.log("==================================================");
  console.log("Database Query Indexing & EXPLAIN ANALYZE Audit");
  console.log("==================================================");

  // 1. Ensure a realistic volume of data is present
  const userCount = await prisma.user.count();
  if (userCount < 10) {
    console.log("Seeding realistic volume dataset (100 users, 100 repos, 200 issues, 500 notifications)...");
    for (let i = 0; i < 100; i++) {
      const username = `perf_user_${i}_${Date.now().toString().slice(-4)}`;
      const user = await prisma.user.create({
        data: {
          username,
          email: `${username}@perf.local`,
          passwordHash: 'dummyhash',
          repositories: {
            create: [
              { name: `perf-repo-1-${i}` },
              { name: `perf-repo-2-${i}` }
            ]
          }
        }
      });

      const repo = await prisma.repository.findFirst({ where: { ownerId: user.id } });
      if (repo) {
        await prisma.issue.createMany({
          data: [
            { title: 'Perf issue 1', body: 'details', repositoryId: repo.id, authorId: user.id },
            { title: 'Perf issue 2', body: 'details', repositoryId: repo.id, authorId: user.id }
          ]
        });

        await prisma.notification.createMany({
          data: [
            { recipientId: user.id, senderId: user.id, repositoryId: repo.id, notifiableType: 'Issue', notifiableId: '1', reason: 'SUBSCRIBED', title: 'test', body: 'test', url: '/' },
            { recipientId: user.id, senderId: user.id, repositoryId: repo.id, notifiableType: 'Issue', notifiableId: '1', reason: 'SUBSCRIBED', title: 'test2', body: 'test2', url: '/', isRead: true }
          ]
        });
      }
    }
    console.log("Seeding completed.");
  }

  const testUser = await prisma.user.findFirst();
  const testRepo = await prisma.repository.findFirst();

  // 2. EXPLAIN ANALYZE - Repository lookup by owner/name
  console.log("\n1. EXPLAIN ANALYZE: Repository lookup by ownerId & name");
  const planRepo = await prisma.$queryRawUnsafe(
    `EXPLAIN ANALYZE SELECT * FROM "Repository" WHERE "ownerId" = '${testUser.id}' AND "name" = '${testRepo.name}'`
  );
  planRepo.forEach(row => console.log(row['QUERY PLAN']));

  // 3. EXPLAIN ANALYZE - Issues lookup by repo ID
  console.log("\n2. EXPLAIN ANALYZE: Issues lookup by repositoryId");
  const planIssues = await prisma.$queryRawUnsafe(
    `EXPLAIN ANALYZE SELECT * FROM "Issue" WHERE "repositoryId" = '${testRepo.id}' ORDER BY "createdAt" DESC`
  );
  planIssues.forEach(row => console.log(row['QUERY PLAN']));

  // 4. EXPLAIN ANALYZE - Unread Notifications count
  console.log("\n3. EXPLAIN ANALYZE: Unread notifications count");
  const planNotifs = await prisma.$queryRawUnsafe(
    `EXPLAIN ANALYZE SELECT COUNT(*) FROM "Notification" WHERE "recipientId" = '${testUser.id}' AND "isRead" = false`
  );
  planNotifs.forEach(row => console.log(row['QUERY PLAN']));
}

runAudit().catch(console.error);

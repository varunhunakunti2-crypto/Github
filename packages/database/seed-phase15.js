const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const testowner = await prisma.user.upsert({
    where: { username: 'testowner' },
    update: {},
    create: { username: 'testowner', email: 'testowner@test.com', passwordHash: 'test' }
  });
  console.log('testowner:', testowner.id);

  const testauthor = await prisma.user.upsert({
    where: { username: 'testauthor' },
    update: {},
    create: { username: 'testauthor', email: 'testauthor2@test.com', passwordHash: 'test' }
  });
  console.log('testauthor:', testauthor.id);

  const testreviewer = await prisma.user.upsert({
    where: { username: 'testreviewer' },
    update: {},
    create: { username: 'testreviewer', email: 'testreviewer2@test.com', passwordHash: 'test' }
  });
  console.log('testreviewer:', testreviewer.id);

  const repo = await prisma.repository.upsert({
    where: { ownerId_name: { ownerId: testowner.id, name: 'phase14' } },
    update: {},
    create: { name: 'phase14', ownerId: testowner.id, description: 'Phase 14/15 test repo' }
  });
  console.log('repo:', repo.id);

  try {
    const issue = await prisma.issue.create({
      data: { number: 1, title: 'Initial setup issue', body: 'Fix initial setup', status: 'OPEN', creatorId: testowner.id, repositoryId: repo.id }
    });
    console.log('issue #1:', issue.id);
  } catch(e) { console.log('issue may already exist:', e.message); }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

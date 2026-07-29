const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Seed users
  const appi = await prisma.user.upsert({
    where: { username: 'appi' },
    update: {},
    create: { username: 'appi', email: 'appi@example.com', passwordHash: 'test' }
  });

  const testowner = await prisma.user.upsert({
    where: { username: 'testowner' },
    update: {},
    create: { username: 'testowner', email: 'testowner@example.com', passwordHash: 'test' }
  });

  const testauthor = await prisma.user.upsert({
    where: { username: 'testauthor' },
    update: {},
    create: { username: 'testauthor', email: 'testauthor@example.com', passwordHash: 'test' }
  });

  const testreviewer = await prisma.user.upsert({
    where: { username: 'testreviewer' },
    update: {},
    create: { username: 'testreviewer', email: 'testreviewer@example.com', passwordHash: 'test' }
  });

  // 2. Seed repository
  const repo = await prisma.repository.upsert({
    where: { ownerId_name: { ownerId: appi.id, name: 'phase16' } },
    update: {},
    create: {
      name: 'phase16',
      ownerId: appi.id,
      description: 'Phase 16 test repo'
    }
  });

  // 3. Clear existing labels/milestones/issues/projects for clean setup
  await prisma.comment.deleteMany({});
  await prisma.projectItem.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.issue.deleteMany({ where: { repositoryId: repo.id } });
  await prisma.label.deleteMany({ where: { repositoryId: repo.id } });
  await prisma.milestone.deleteMany({ where: { repositoryId: repo.id } });

  // 4. Seed labels
  const bug = await prisma.label.create({
    data: { name: 'bug', color: 'd1242f', description: 'Something is broken', repositoryId: repo.id }
  });

  const enhancement = await prisma.label.create({
    data: { name: 'enhancement', color: '0969da', description: 'New feature request', repositoryId: repo.id }
  });

  const documentation = await prisma.label.create({
    data: { name: 'documentation', color: '8c95a0', description: 'Docs updates', repositoryId: repo.id }
  });

  // 5. Seed Milestones
  const msOpen = await prisma.milestone.create({
    data: {
      title: 'v1.0.0 Release',
      description: 'Major v1 stable release',
      dueDate: new Date(Date.now() + 86400000), // tomorrow
      status: 'OPEN',
      repositoryId: repo.id
    }
  });

  const msClosed = await prisma.milestone.create({
    data: {
      title: 'v0.9.0 Beta',
      description: 'Initial beta milestones',
      dueDate: new Date(Date.now() - 86400000), // yesterday
      status: 'CLOSED',
      repositoryId: repo.id
    }
  });

  // 6. Seed Issues
  const issue1 = await prisma.issue.create({
    data: {
      number: 1,
      title: 'Critical signup page crash',
      body: 'App crashes when submitting the signup form.',
      status: 'OPEN',
      creatorId: appi.id,
      repositoryId: repo.id,
      milestoneId: msOpen.id,
      labels: { connect: [{ id: bug.id }] },
      assignees: { connect: [{ id: appi.id }] }
    }
  });

  const issue2 = await prisma.issue.create({
    data: {
      number: 2,
      title: 'Add dark mode interface',
      body: 'Dark theme for improved legibility.',
      status: 'OPEN',
      creatorId: testauthor.id,
      repositoryId: repo.id,
      milestoneId: msOpen.id,
      labels: { connect: [{ id: enhancement.id }] },
      assignees: { connect: [{ id: testauthor.id }] }
    }
  });

  const issue3 = await prisma.issue.create({
    data: {
      number: 3,
      title: 'Update installation instructions',
      body: 'Add windows installer guide.',
      status: 'CLOSED',
      creatorId: appi.id,
      repositoryId: repo.id,
      milestoneId: msOpen.id,
      labels: { connect: [{ id: documentation.id }] },
      assignees: { connect: [{ id: appi.id }] }
    }
  });

  const issue4 = await prisma.issue.create({
    data: {
      number: 4,
      title: 'Initial backend routing setup',
      body: 'Setup initial NestJS controllers.',
      status: 'CLOSED',
      creatorId: testowner.id,
      repositoryId: repo.id,
      milestoneId: msClosed.id,
      assignees: { connect: [{ id: testreviewer.id }] }
    }
  });

  const issue5 = await prisma.issue.create({
    data: {
      number: 5,
      title: 'Database migration script failure',
      body: 'Migration script hangs on fresh instances.',
      status: 'CLOSED',
      creatorId: appi.id,
      repositoryId: repo.id,
      milestoneId: msClosed.id,
      labels: { connect: [{ id: bug.id }] },
      assignees: { connect: [{ id: appi.id }] }
    }
  });

  const issue6 = await prisma.issue.create({
    data: {
      number: 6,
      title: 'Add MFA authentication flow',
      body: 'Implement TOTP and authenticator setup.',
      status: 'OPEN',
      creatorId: testreviewer.id,
      repositoryId: repo.id,
      assignees: { connect: [{ id: testreviewer.id }] }
    }
  });

  const issue7 = await prisma.issue.create({
    data: {
      number: 7,
      title: 'Improve CSS rendering on mobile',
      body: 'Columns stack improperly on small screens.',
      status: 'OPEN',
      creatorId: appi.id,
      repositoryId: repo.id,
      labels: { connect: [{ id: enhancement.id }] }
    }
  });

  const issue8 = await prisma.issue.create({
    data: {
      number: 8,
      title: 'CI test workflow pipeline fix',
      body: 'Github Actions test step timeouts.',
      status: 'OPEN',
      creatorId: appi.id,
      repositoryId: repo.id
    }
  });

  // 7. Seed Project
  const project = await prisma.project.create({
    data: {
      title: 'GitForge Sprint Board',
      description: 'Current sprint planning and notes board',
      repositoryId: repo.id
    }
  });

  await prisma.projectItem.create({
    data: { projectId: project.id, itemType: 'issue', itemId: issue1.id, statusColumn: 'Todo', position: 0 }
  });
  await prisma.projectItem.create({
    data: { projectId: project.id, itemType: 'issue', itemId: issue2.id, statusColumn: 'In Progress', position: 0 }
  });
  await prisma.projectItem.create({
    data: { projectId: project.id, itemType: 'issue', itemId: issue3.id, statusColumn: 'Done', position: 0 }
  });
  await prisma.projectItem.create({
    data: { projectId: project.id, itemType: 'note', noteTitle: 'Write documentation guidelines', noteBody: 'Specify formatting rules', statusColumn: 'Todo', position: 1 }
  });

  console.log('Seeding Phase 16 complete!');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

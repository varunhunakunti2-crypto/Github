const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Setup/get users
  const appi = await prisma.user.upsert({
    where: { username: 'appi' },
    update: {},
    create: { username: 'appi', email: 'appi@test.com', passwordHash: 'test' }
  });
  console.log('User appi:', appi.id);

  const testowner = await prisma.user.upsert({
    where: { username: 'testowner' },
    update: {},
    create: { username: 'testowner', email: 'testowner@test.com', passwordHash: 'test' }
  });
  console.log('User testowner:', testowner.id);

  const testauthor = await prisma.user.upsert({
    where: { username: 'testauthor' },
    update: {},
    create: { username: 'testauthor', email: 'testauthor@test.com', passwordHash: 'test' }
  });
  console.log('User testauthor:', testauthor.id);

  const testvoter = await prisma.user.upsert({
    where: { username: 'testvoter' },
    update: {},
    create: { username: 'testvoter', email: 'testvoter@test.com', passwordHash: 'test' }
  });
  console.log('User testvoter:', testvoter.id);

  // 2. Setup repository owned by appi
  const repo = await prisma.repository.upsert({
    where: { ownerId_name: { ownerId: appi.id, name: 'discussions-repo' } },
    update: {},
    create: { name: 'discussions-repo', ownerId: appi.id, description: 'Repository for Phase 17 Discussions testing' }
  });
  console.log('Repo discussions-repo:', repo.id);

  // Clear existing discussions for this repo if any
  await prisma.discussion.deleteMany({ where: { repositoryId: repo.id } });

  // 3. Create Discussions

  // --- Category: Announcements ---
  const announce1 = await prisma.discussion.create({
    data: {
      number: 1,
      category: 'Announcements',
      title: 'Welcome to the project! (Pinned)',
      body: 'This is a pinned announcement welcoming everyone.',
      authorId: appi.id,
      repositoryId: repo.id,
      isPinned: true
    }
  });

  const announce2 = await prisma.discussion.create({
    data: {
      number: 2,
      category: 'Announcements',
      title: 'Release v1.0 is coming soon',
      body: 'Stay tuned for updates on v1.0 release details.',
      authorId: appi.id,
      repositoryId: repo.id,
      isPinned: false
    }
  });

  // --- Category: Q&A ---
  const qa1 = await prisma.discussion.create({
    data: {
      number: 3,
      category: 'Q&A',
      title: 'How do I run migrations in this repo? (Unanswered)',
      body: 'Can anyone tell me how to run db migrations or schema sync?',
      authorId: testauthor.id,
      repositoryId: repo.id
    }
  });

  const qa2 = await prisma.discussion.create({
    data: {
      number: 4,
      category: 'Q&A',
      title: 'Where can I find the API documentation? (Answered)',
      body: 'Is there a markdown file detailing all backend endpoints?',
      authorId: testauthor.id,
      repositoryId: repo.id
    }
  });

  // Create a comment to mark as answer
  const answerComment = await prisma.comment.create({
    data: {
      body: 'You can find the API documentation in docs/API.md.',
      userId: appi.id,
      discussionId: qa2.id
    }
  });

  // Mark answer
  await prisma.discussion.update({
    where: { id: qa2.id },
    data: { answeredCommentId: answerComment.id }
  });

  // --- Category: Ideas (Polls) ---
  const idea1 = await prisma.discussion.create({
    data: {
      number: 5,
      category: 'Ideas',
      title: 'Should we add dark mode support? (Single-select Poll)',
      body: 'Cast your vote for the preferred theme behavior.',
      authorId: testauthor.id,
      repositoryId: repo.id,
      allowMultiplePollVotes: false
    }
  });

  const optA = await prisma.pollOption.create({ data: { discussionId: idea1.id, text: 'Option A: Pure Dark Mode', position: 0 } });
  const optB = await prisma.pollOption.create({ data: { discussionId: idea1.id, text: 'Option B: Hybrid Theme', position: 1 } });
  const optC = await prisma.pollOption.create({ data: { discussionId: idea1.id, text: 'Option C: Light Mode only', position: 2 } });

  // Vote for Option A as testvoter
  await prisma.pollVote.create({ data: { pollOptionId: optA.id, userId: testvoter.id } });

  const idea2 = await prisma.discussion.create({
    data: {
      number: 6,
      category: 'Ideas',
      title: 'What programming languages should we support next? (Multi-select)',
      body: 'Pick all options that you are interested in.',
      authorId: testauthor.id,
      repositoryId: repo.id,
      allowMultiplePollVotes: true
    }
  });

  const optX = await prisma.pollOption.create({ data: { discussionId: idea2.id, text: 'Option X: Rust', position: 0 } });
  const optY = await prisma.pollOption.create({ data: { discussionId: idea2.id, text: 'Option Y: Go', position: 1 } });

  // Vote for both Rust and Go as testvoter
  await prisma.pollVote.create({ data: { pollOptionId: optX.id, userId: testvoter.id } });
  await prisma.pollVote.create({ data: { pollOptionId: optY.id, userId: testvoter.id } });

  // --- Category: General ---
  await prisma.discussion.create({
    data: {
      number: 7,
      category: 'General',
      title: 'What are you working on this week?',
      body: 'Share your plans, progress, or blockers here.',
      authorId: appi.id,
      repositoryId: repo.id
    }
  });

  await prisma.discussion.create({
    data: {
      number: 8,
      category: 'General',
      title: 'Virtual coffee virtual meetup plans',
      body: 'Let us organize a developer hangout session soon.',
      authorId: appi.id,
      repositoryId: repo.id
    }
  });

  // --- Category: Show and tell ---
  await prisma.discussion.create({
    data: {
      number: 9,
      category: 'Show and tell',
      title: 'My new VS Code extension demo',
      body: 'Checkout the screenshot and feature checklist below!',
      authorId: testauthor.id,
      repositoryId: repo.id
    }
  });

  await prisma.discussion.create({
    data: {
      number: 10,
      category: 'Show and tell',
      title: 'Fast JSON Parser built in Rust',
      body: 'Just benchmarked it and it is 2x faster than alternatives.',
      authorId: testauthor.id,
      repositoryId: repo.id
    }
  });

  console.log('Seeding Phase 17 completed successfully!');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

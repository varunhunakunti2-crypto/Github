const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://postgres:root%40123@localhost:5432/gitforge"
    }
  }
});

async function main() {
  console.log("Seeding Phase 21 Search test data...");

  // 1. Ensure users exist
  const appi = await prisma.user.upsert({
    where: { username: 'appi' },
    update: {},
    create: { username: 'appi', email: 'appi@example.com', passwordHash: 'test' }
  });

  const searchmember = await prisma.user.upsert({
    where: { username: 'searchmember' },
    update: {},
    create: { username: 'searchmember', email: 'searchmember@example.com', passwordHash: 'test' }
  });

  const unauthorizeduser = await prisma.user.upsert({
    where: { username: 'unauthorizeduser' },
    update: {},
    create: { username: 'unauthorizeduser', email: 'unauthorized@example.com', passwordHash: 'test' }
  });

  const distinctuser = await prisma.user.upsert({
    where: { username: 'distinctuser' },
    update: {},
    create: { username: 'distinctuser', email: 'distinctuser@example.com', passwordHash: 'test', name: 'Distinctive User Name' }
  });

  // 2. Clear old test data
  await prisma.organizationMember.deleteMany({});
  await prisma.teamMember.deleteMany({});
  await prisma.invitation.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.codeSearchIndex.deleteMany({});
  await prisma.issue.deleteMany({});
  await prisma.pullRequest.deleteMany({});
  await prisma.repository.deleteMany({});
  await prisma.organization.deleteMany({});

  // 3. Create Org
  const org = await prisma.organization.create({
    data: {
      name: "Distinctive Org Name",
      slug: "distinctorg",
      billingEmail: "billing@distinctorg.com",
      ownerId: appi.id
    }
  });

  // Add members to org
  await prisma.organizationMember.createMany({
    data: [
      { organizationId: org.id, userId: appi.id, role: "OWNER" },
      { organizationId: org.id, userId: searchmember.id, role: "MEMBER" }
    ]
  });

  // 4. Create Repositories
  const publicRepo = await prisma.repository.create({
    data: {
      name: "distinct-public-repo",
      isPrivate: false,
      ownerId: null,
      organizationId: org.id,
      description: "A very distinctive public repository used for search verification tests"
    }
  });

  const privateRepo = await prisma.repository.create({
    data: {
      name: "distinct-private-repo",
      isPrivate: true,
      ownerId: null,
      organizationId: org.id,
      description: "A private repository with highly secret code files"
    }
  });

  const tsRepo = await prisma.repository.create({
    data: {
      name: "another-ts-repo",
      isPrivate: false,
      ownerId: appi.id,
      description: "A public typescript engine repo"
    }
  });

  const reactRepo = await prisma.repository.create({
    data: {
      name: "js-react-repo",
      isPrivate: false,
      ownerId: appi.id,
      description: "React client library in javascript language"
    }
  });

  // Note: We can simulate languages or star counts in standard fields. Since Repository model
  // does not have a native stars count (it uses watch_count/star_count in queries or mock),
  // we can use standard fields or mock it if needed. Let's make sure we set them if fields exist.
  // Let's run a query updates to set star_count if available.
  // Wait, in schema.prisma, stars are not a column but a relation or a count in queries. That is fine,
  // we can mock the search filter or verify it.

  // 5. Create Issues and PRs
  await prisma.issue.create({
    data: {
      number: 1,
      title: "distinctive issue title one",
      body: "This is a body of the distinctive issue",
      status: "OPEN",
      creatorId: appi.id,
      repositoryId: publicRepo.id
    }
  });

  await prisma.pullRequest.create({
    data: {
      number: 2,
      title: "distinctive pr title two",
      body: "This is a body of the distinctive PR",
      status: "CLOSED",
      baseBranch: "main",
      compareBranch: "patch",
      creatorId: appi.id,
      repositoryId: publicRepo.id
    }
  });

  await prisma.issue.create({
    data: {
      number: 1,
      title: "private secret issue three",
      body: "This issue should never be exposed to unauthorized users",
      status: "OPEN",
      creatorId: appi.id,
      repositoryId: privateRepo.id
    }
  });

  // 6. Create CodeSearchIndex items
  await prisma.codeSearchIndex.create({
    data: {
      repositoryId: publicRepo.id,
      filePath: "src/app.ts",
      contentExcerpt: "import { foo } from './bar';\n// welcome to the distinctive public repo\n// search term: supercalifragilisticexpialidocious\nconsole.log(foo);"
    }
  });

  await prisma.codeSearchIndex.create({
    data: {
      repositoryId: privateRepo.id,
      filePath: "src/secret.ts",
      contentExcerpt: "const apiKey = 'secret top code search term: securepassword12345';\nconsole.log(apiKey);"
    }
  });

  // Run raw SQL to update tsvector generated columns
  await prisma.$executeRawUnsafe(`UPDATE "Repository" SET id = id;`);
  await prisma.$executeRawUnsafe(`UPDATE "User" SET id = id;`);
  await prisma.$executeRawUnsafe(`UPDATE "Issue" SET id = id;`);
  await prisma.$executeRawUnsafe(`UPDATE "PullRequest" SET id = id;`);
  await prisma.$executeRawUnsafe(`UPDATE "CodeSearchIndex" SET id = id;`);

  console.log("Seeding completed successfully!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

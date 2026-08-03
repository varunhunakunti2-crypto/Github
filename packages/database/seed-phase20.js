const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://postgres:root%40123@localhost:5432/gitforge"
    }
  }
});

async function main() {
  console.log("Seeding Phase 20 Organizations test data...");

  // 1. Ensure users exist
  const appi = await prisma.user.upsert({
    where: { username: 'appi' },
    update: {},
    create: { username: 'appi', email: 'appi@example.com', passwordHash: 'test' }
  });

  const member1 = await prisma.user.upsert({
    where: { username: 'member1' },
    update: {},
    create: { username: 'member1', email: 'member1@example.com', passwordHash: 'test' }
  });

  const member2 = await prisma.user.upsert({
    where: { username: 'member2' },
    update: {},
    create: { username: 'member2', email: 'member2@example.com', passwordHash: 'test' }
  });

  const testreviewer = await prisma.user.upsert({
    where: { username: 'testreviewer' },
    update: {},
    create: { username: 'testreviewer', email: 'testreviewer@example.com', passwordHash: 'test' }
  });

  // 2. Clear existing test orgs/members/teams
  await prisma.organizationMember.deleteMany({});
  await prisma.teamMember.deleteMany({});
  await prisma.invitation.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.organization.deleteMany({});

  // 3. Create organization
  const org = await prisma.organization.create({
    data: {
      name: "Acme Corp",
      slug: "acme",
      billingEmail: "billing@acme.com",
      ownerId: appi.id
    }
  });

  // 4. Add members to organization
  await prisma.organizationMember.createMany({
    data: [
      { organizationId: org.id, userId: appi.id, role: "OWNER" },
      { organizationId: org.id, userId: member1.id, role: "MEMBER" },
      { organizationId: org.id, userId: member2.id, role: "MEMBER" }
    ]
  });

  // 5. Create teams
  const engTeam = await prisma.team.create({
    data: {
      name: "Engineering",
      slug: "eng",
      privacy: "VISIBLE",
      organizationId: org.id
    }
  });

  const qaTeam = await prisma.team.create({
    data: {
      name: "Quality Assurance",
      slug: "qa",
      privacy: "VISIBLE",
      organizationId: org.id,
      parentTeamId: engTeam.id
    }
  });

  // 6. Set up team memberships
  await prisma.teamMember.createMany({
    data: [
      { teamId: engTeam.id, userId: member1.id, role: "MAINTAINER" },
      { teamId: qaTeam.id, userId: member2.id, role: "MEMBER" }
    ]
  });

  // 7. Create invitations
  await prisma.invitation.createMany({
    data: [
      {
        organizationId: org.id,
        invitedUserId: testreviewer.id,
        invitedEmail: testreviewer.email,
        invitedById: appi.id,
        role: "MEMBER",
        status: "PENDING",
        token: "token-registered-user",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      {
        organizationId: org.id,
        invitedEmail: "newuser@example.com",
        invitedById: appi.id,
        role: "MEMBER",
        status: "PENDING",
        token: "token-email-unregistered",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      {
        organizationId: org.id,
        invitedEmail: "expired@example.com",
        invitedById: appi.id,
        role: "MEMBER",
        status: "PENDING",
        token: "token-expired",
        expiresAt: new Date(Date.now() - 1000) // already expired
      }
    ]
  });

  // 8. Create a private repository owned by the organization
  const repo = await prisma.repository.create({
    data: {
      name: "acme-core",
      isPrivate: true,
      ownerId: null,
      organizationId: org.id,
      description: "Acme core private repositories"
    }
  });

  // 9. Grant team access (only engTeam has access)
  await prisma.permission.create({
    data: {
      repositoryId: repo.id,
      granteeType: "TEAM",
      granteeId: engTeam.id,
      accessLevel: "WRITE"
    }
  });

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

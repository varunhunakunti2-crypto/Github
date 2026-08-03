const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://postgres:root%40123@localhost:5432/gitforge"
    }
  }
});

async function main() {
  console.log("Seeding Phase 23 Projects test data...");

  const appi = await prisma.user.findFirst({ where: { username: "appi" } });
  if (!appi) {
    console.error("Please run the previous seed scripts first!");
    process.exit(1);
  }

  // Clear old projects
  await prisma.projectView.deleteMany({});
  await prisma.projectItem.deleteMany({});
  await prisma.project.deleteMany({});

  // 1. Create a Repository specifically for projects test
  const repo = await prisma.repository.upsert({
    where: { ownerId_name: { ownerId: appi.id, name: "projects-test-repo" } },
    update: {},
    create: {
      name: "projects-test-repo",
      isPrivate: false,
      ownerId: appi.id
    }
  });

  // 2. Create Project
  const project = await prisma.project.create({
    data: {
      title: "Projects Roadmapping Board",
      description: "Test board with roadmaps and saved views",
      repositoryId: repo.id
    }
  });

  // 3. Create Views
  await prisma.projectView.createMany({
    data: [
      {
        projectId: project.id,
        viewType: "board",
        name: "Kanban Board View",
        isDefault: true,
        config: JSON.stringify({ groupBy: "status", sortBy: "position" })
      },
      {
        projectId: project.id,
        viewType: "roadmap",
        name: "Roadmap Timeline View",
        isDefault: false,
        config: JSON.stringify({ zoom: "month" })
      }
    ]
  });

  // 4. Create Standalone Task (Note)
  await prisma.projectItem.create({
    data: {
      projectId: project.id,
      itemType: "note",
      noteTitle: "standalone release task",
      noteBody: "Prepare deployment notes for Phase 23 rollout",
      statusColumn: "Todo",
      position: 0,
      startDate: new Date("2026-08-01"),
      dueDate: new Date("2026-08-15"),
      priority: "HIGH",
      isDone: false,
      assigneeId: appi.id
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

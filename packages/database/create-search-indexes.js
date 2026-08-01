const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://postgres:root%40123@localhost:5432/gitforge"
    }
  }
});

async function main() {
  console.log("Setting up tsvector generated columns and GIN indexes...");

  // 1. Repositories search vector and index
  console.log("Creating Repository search index...");
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Repository" ADD COLUMN IF NOT EXISTS "search_vector" tsvector GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce("name", '')), 'A') ||
      setweight(to_tsvector('english', coalesce("description", '')), 'B')
    ) STORED;
  `).catch(e => console.warn("Notice: Column might already exist or generated expression failed:", e.message));

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "repository_search_idx" ON "Repository" USING gin("search_vector");
  `);

  // 2. Users search vector and index
  console.log("Creating User search index...");
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "search_vector" tsvector GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce("username", '')), 'A') ||
      setweight(to_tsvector('english', coalesce("name", '')), 'B')
    ) STORED;
  `).catch(e => console.warn("Notice: Column might already exist or generated expression failed:", e.message));

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "user_search_idx" ON "User" USING gin("search_vector");
  `);

  // 3. Issues search vector and index
  console.log("Creating Issue search index...");
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "search_vector" tsvector GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
      setweight(to_tsvector('english', coalesce("body", '')), 'B')
    ) STORED;
  `).catch(e => console.warn("Notice: Column might already exist or generated expression failed:", e.message));

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "issue_search_idx" ON "Issue" USING gin("search_vector");
  `);

  // 4. Pull Requests search vector and index
  console.log("Creating PullRequest search index...");
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "PullRequest" ADD COLUMN IF NOT EXISTS "search_vector" tsvector GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
      setweight(to_tsvector('english', coalesce("body", '')), 'B')
    ) STORED;
  `).catch(e => console.warn("Notice: Column might already exist or generated expression failed:", e.message));

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "pullrequest_search_idx" ON "PullRequest" USING gin("search_vector");
  `);

  // 5. CodeSearchIndex search vector and index
  console.log("Creating CodeSearchIndex search index...");
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "CodeSearchIndex" ADD COLUMN IF NOT EXISTS "search_vector" tsvector GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce("filePath", '')), 'A') ||
      setweight(to_tsvector('english', coalesce("contentExcerpt", '')), 'B')
    ) STORED;
  `).catch(e => console.warn("Notice: Column might already exist or generated expression failed:", e.message));

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "codesearch_search_idx" ON "CodeSearchIndex" USING gin("search_vector");
  `);

  console.log("All full-text search indexes created successfully!");
}

main()
  .catch(e => {
    console.error("Failed to set up full-text indexes:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

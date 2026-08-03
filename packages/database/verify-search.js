const { prisma } = require('@gitforge/database');
const { SearchService } = require('../../backend/dist/services/search/search.service');
const { IndexSyncJob } = require('../../backend/dist/services/search/index-sync.job');

async function runTests() {
  console.log("Running Phase 21 Search Verification Tests...");

  const searchService = new SearchService();
  const syncJob = new IndexSyncJob();

  // Load seeded users
  const appi = await prisma.user.findUnique({ where: { username: 'appi' } });
  const member1 = await prisma.user.findUnique({ where: { username: 'member1' } });
  const member2 = await prisma.user.findUnique({ where: { username: 'member2' } });

  const results = [];

  const recordResult = (num, name, status, evidence, notes) => {
    results.push({ num, name, status, evidence, notes });
    console.log(`Test ${num}: [${status}] - ${name}`);
  };

  // 1. Verify Qualifiers Parsing
  try {
    const rawQuery = "react language:typescript stars:>500 is:open org:acme user:varun repo:core";
    const parsed = searchService.parseQuery(rawQuery);
    
    const isLangOk = parsed.language === "typescript";
    const isStarsOk = parsed.starsOp === ">" && parsed.starsVal === 500;
    const isIsOpenOk = parsed.isOpen === true;
    const isOrgOk = parsed.orgSlug === "acme";
    const isUserOk = parsed.userSlug === "varun";
    const isRepoOk = parsed.repoName === "core";
    const isTextOk = parsed.textQuery === "react";

    if (isLangOk && isStarsOk && isIsOpenOk && isOrgOk && isUserOk && isRepoOk && isTextOk) {
      recordResult(1, "Search Qualifiers Parsing", "PASS", "All qualifiers parsed correctly", "");
    } else {
      recordResult(1, "Search Qualifiers Parsing", "FAIL", JSON.stringify(parsed), "Qualifier mismatch");
    }
  } catch (e) {
    recordResult(1, "Search Qualifiers Parsing", "FAIL", e.message, "");
  }

  // 2. Scoped Visibility Check: Member with Access (member1)
  try {
    const repos = await searchService.searchRepositories("acme-core", member1.id);
    const hasCore = repos.some(r => r.name === "acme-core");
    if (hasCore) {
      recordResult(2, "Scoped Access - Member with Access", "PASS", "member1 sees acme-core repo in search results", "");
    } else {
      recordResult(2, "Scoped Access - Member with Access", "FAIL", "member1 did not see acme-core in search", "");
    }
  } catch (e) {
    recordResult(2, "Scoped Access - Member with Access", "FAIL", e.message, "");
  }

  // 3. Scoped Visibility Check: Member WITHOUT Access (member2)
  try {
    const repos = await searchService.searchRepositories("acme-core", member2.id);
    const hasCore = repos.some(r => r.name === "acme-core");
    if (!hasCore) {
      recordResult(3, "Scoped Access - Member without Access", "PASS", "member2 does NOT see acme-core in search results", "Enforces strict private scoping");
    } else {
      recordResult(3, "Scoped Access - Member without Access", "FAIL", "member2 saw private repo acme-core without permissions", "");
    }
  } catch (e) {
    recordResult(3, "Scoped Access - Member without Access", "FAIL", e.message, "");
  }

  // 4. Index code search mock file and execute code search
  try {
    // Let's seed a mock code search index item
    const repo = await prisma.repository.findFirst({ where: { name: "acme-core" } });
    await prisma.codeSearchIndex.deleteMany({ where: { repositoryId: repo.id } });
    
    await prisma.codeSearchIndex.create({
      data: {
        repositoryId: repo.id,
        filePath: "src/index.ts",
        contentExcerpt: "import express from 'express';\nconst app = express();\nconsole.log('Acme engine started');"
      }
    });

    // Run custom SQL to update tsvector generated column
    await prisma.$executeRawUnsafe(`
      UPDATE "CodeSearchIndex" SET id = id;
    `);

    // Search code for 'Acme engine' as member1 (who has access)
    const codeResults = await searchService.searchCode("engine", member1.id);
    const matched = codeResults.some(c => c.filePath === "src/index.ts" && c.excerpt.includes("Acme engine started"));

    // Search code for 'Acme engine' as member2 (who has NO access)
    const codeResultsNoAccess = await searchService.searchCode("engine", member2.id);
    const matchedNoAccess = codeResultsNoAccess.some(c => c.filePath === "src/index.ts");

    if (matched && !matchedNoAccess) {
      recordResult(4, "Code Search Scoping & Excerpt Highlights", "PASS", "member1 finds file excerpt, member2 blocked", "");
    } else {
      recordResult(4, "Code Search Scoping & Excerpt Highlights", "FAIL", `member1 matched: ${matched}, member2 matched: ${matchedNoAccess}`, "");
    }
  } catch (e) {
    recordResult(4, "Code Search Scoping & Excerpt Highlights", "FAIL", e.message, "");
  }

  console.log("\nSearch Verification Tests Completed.");
}

runTests();

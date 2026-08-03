const { prisma } = require('@gitforge/database');
const { SearchService } = require('../../backend/dist/services/search/search.service');

async function runTests() {
  console.log("Running Phase 21 Search End-to-End Verification Tests...");

  const searchService = new SearchService();

  // Load seeded users
  const appi = await prisma.user.findUnique({ where: { username: 'appi' } });
  const searchmember = await prisma.user.findUnique({ where: { username: 'searchmember' } });
  const unauthorizeduser = await prisma.user.findUnique({ where: { username: 'unauthorizeduser' } });
  const distinctuser = await prisma.user.findUnique({ where: { username: 'distinctuser' } });

  const recordResult = (num, name, status, evidence, notes) => {
    console.log(`Test ${num} | ${status} | ${evidence} | ${notes}`);
  };

  // 1. Search public repo exact name
  try {
    const repos = await searchService.searchRepositories("distinct-public-repo", appi.id);
    const first = repos[0];
    if (first && first.name === "distinct-public-repo") {
      recordResult(1, "Search public repo name", "PASS", "first result is distinct-public-repo", "Exact name matches rank at the top");
    } else {
      recordResult(1, "Search public repo name", "FAIL", "first result is not distinct-public-repo", "");
    }
  } catch (e) {
    recordResult(1, "Search public repo name", "FAIL", e.message, "");
  }

  // 2. Search unique string from code file
  try {
    const codeResults = await searchService.searchCode("supercalifragilisticexpialidocious", appi.id);
    const match = codeResults.find(c => c.filePath === "src/app.ts");
    if (match && match.excerpt.includes("supercalifragilisticexpialidocious")) {
      recordResult(2, "Search unique string from code", "PASS", "matched src/app.ts with highlighted snippet", "Code excerpt matches string");
    } else {
      recordResult(2, "Search unique string from code", "FAIL", "no matching excerpt found", "");
    }
  } catch (e) {
    recordResult(2, "Search unique string from code", "FAIL", e.message, "");
  }

  // 3. Search issue title
  try {
    const issues = await searchService.searchIssues("distinctive issue title one", appi.id, false);
    if (issues.length > 0 && issues[0].title === "distinctive issue title one") {
      recordResult(3, "Search issue title", "PASS", "issue found in search results", "");
    } else {
      recordResult(3, "Search issue title", "FAIL", "issue not found", "");
    }
  } catch (e) {
    recordResult(3, "Search issue title", "FAIL", e.message, "");
  }

  // 4. Search username
  try {
    const users = await searchService.searchUsers("distinctuser");
    if (users.length > 0 && users[0].username === "distinctuser") {
      recordResult(4, "Search username", "PASS", "username distinctuser found", "");
    } else {
      recordResult(4, "Search username", "FAIL", "username not found", "");
    }
  } catch (e) {
    recordResult(4, "Search username", "FAIL", e.message, "");
  }

  // 5. Search org name
  try {
    const orgs = await searchService.searchOrganizations("Distinctive Org Name");
    if (orgs.length > 0 && orgs[0].slug === "distinctorg") {
      recordResult(5, "Search organization name", "PASS", "org slug distinctorg found", "");
    } else {
      recordResult(5, "Search organization name", "FAIL", "org not found", "");
    }
  } catch (e) {
    recordResult(5, "Search organization name", "FAIL", e.message, "");
  }

  // 6. BLOCKING: Unauthorized user cannot search private repo name
  try {
    const repos = await searchService.searchRepositories("distinct-private-repo", unauthorizeduser.id);
    const hasCore = repos.some(r => r.name === "distinct-private-repo");
    if (!hasCore) {
      recordResult(6, "Unauthorized user repo scoping", "PASS", "distinct-private-repo does not appear in search results", "Enforces direct database permission checks");
    } else {
      recordResult(6, "Unauthorized user repo scoping", "FAIL", "distinct-private-repo leaked to unauthorized user", "Security check failed");
    }
  } catch (e) {
    recordResult(6, "Unauthorized user repo scoping", "FAIL", e.message, "");
  }

  // 7. BLOCKING: Unauthorized user cannot search private code string
  try {
    const codeResults = await searchService.searchCode("securepassword12345", unauthorizeduser.id);
    const hasCode = codeResults.some(c => c.filePath === "src/secret.ts");
    if (!hasCode) {
      recordResult(7, "Unauthorized user code scoping", "PASS", "securepassword12345 returns zero results", "Enforces strict private code search scoping");
    } else {
      recordResult(7, "Unauthorized user code scoping", "FAIL", "securepassword12345 leaked private snippet", "Security check failed");
    }
  } catch (e) {
    recordResult(7, "Unauthorized user code scoping", "FAIL", e.message, "");
  }

  // 8. BLOCKING: Unauthorized user cannot search private issues/PRs
  try {
    const issues = await searchService.searchIssues("private secret issue three", unauthorizeduser.id, false);
    const hasIssue = issues.some(i => i.title === "private secret issue three");
    if (!hasIssue) {
      recordResult(8, "Unauthorized user issue scoping", "PASS", "private secret issue three returns zero results", "Enforces strict private issues scoping");
    } else {
      recordResult(8, "Unauthorized user issue scoping", "FAIL", "private secret issue leaked to unauthorized user", "Security check failed");
    }
  } catch (e) {
    recordResult(8, "Unauthorized user issue scoping", "FAIL", e.message, "");
  }

  // 9. Authorized user gets private repo search results
  try {
    const repos = await searchService.searchRepositories("distinct-private-repo", appi.id);
    const hasCore = repos.some(r => r.name === "distinct-private-repo");
    const codeResults = await searchService.searchCode("securepassword12345", appi.id);
    const hasCode = codeResults.some(c => c.filePath === "src/secret.ts");
    const issues = await searchService.searchIssues("private secret issue three", appi.id, false);
    const hasIssue = issues.some(i => i.title === "private secret issue three");

    if (hasCore && hasCode && hasIssue) {
      recordResult(9, "Authorized user scoping", "PASS", "appi successfully retrieves private repo, private code, and private issue", "Visibility scoping is correctly permission-based");
    } else {
      recordResult(9, "Authorized user scoping", "FAIL", `hasCore: ${hasCore}, hasCode: ${hasCode}, hasIssue: ${hasIssue}`, "");
    }
  } catch (e) {
    recordResult(9, "Authorized user scoping", "FAIL", e.message, "");
  }

  // 10. Qualifier language
  try {
    const parsed = searchService.parseQuery("language:typescript");
    if (parsed.language === "typescript") {
      recordResult(10, "Qualifier language parsing", "PASS", "parsed language: typescript", "");
    } else {
      recordResult(10, "Qualifier language parsing", "FAIL", JSON.stringify(parsed), "");
    }
  } catch (e) {
    recordResult(10, "Qualifier language parsing", "FAIL", e.message, "");
  }

  // 11. Qualifier stars
  try {
    const parsed = searchService.parseQuery("stars:>100");
    if (parsed.starsOp === ">" && parsed.starsVal === 100) {
      recordResult(11, "Qualifier stars parsing", "PASS", "parsed stars: > 100", "");
    } else {
      recordResult(11, "Qualifier stars parsing", "FAIL", JSON.stringify(parsed), "");
    }
  } catch (e) {
    recordResult(11, "Qualifier stars parsing", "FAIL", e.message, "");
  }

  // 12. Qualifier is:open
  try {
    const parsed = searchService.parseQuery("is:open");
    if (parsed.isOpen === true) {
      recordResult(12, "Qualifier state parsing", "PASS", "parsed isOpen: true", "");
    } else {
      recordResult(12, "Qualifier state parsing", "FAIL", JSON.stringify(parsed), "");
    }
  } catch (e) {
    recordResult(12, "Qualifier state parsing", "FAIL", e.message, "");
  }

  // 13. Qualifier combined query
  try {
    const parsed = searchService.parseQuery("react language:javascript stars:>10");
    if (parsed.textQuery === "react" && parsed.language === "javascript" && parsed.starsOp === ">" && parsed.starsVal === 10) {
      recordResult(13, "Qualifier combined parsing", "PASS", "parsed combined qualifiers successfully", "");
    } else {
      recordResult(13, "Qualifier combined parsing", "FAIL", JSON.stringify(parsed), "");
    }
  } catch (e) {
    recordResult(13, "Qualifier combined parsing", "FAIL", e.message, "");
  }

  // 14. Intentional malformed qualifier handles gracefully
  try {
    const parsed = searchService.parseQuery("stars:>abc");
    if (isNaN(parsed.starsVal)) {
      recordResult(14, "Malformed qualifier grace", "PASS", "invalid stars val handled as NaN", "Does not crash server or database layer");
    } else {
      recordResult(14, "Malformed qualifier grace", "FAIL", JSON.stringify(parsed), "");
    }
  } catch (e) {
    recordResult(14, "Malformed qualifier grace", "FAIL", e.message, "");
  }

  console.log("\nSearch End-to-End Tests Completed.");
}

runTests();

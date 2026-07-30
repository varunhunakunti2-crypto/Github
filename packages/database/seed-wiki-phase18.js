const { execSync, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function seedWiki() {
  const repoPath = path.resolve(__dirname, '..', '..', 'backend', 'git-daemon', 'data', 'repos', 'appi', 'discussions-repo.wiki.git');
  
  // 1. Clean and initialize
  if (fs.existsSync(repoPath)) {
    fs.rmSync(repoPath, { recursive: true });
  }
  fs.mkdirSync(path.dirname(repoPath), { recursive: true });
  execSync(`git init --bare --initial-branch=main "${repoPath}"`);
  console.log('Created bare wiki repo at:', repoPath);

  // Helper to commit to bare repo using plumbing commands
  function commitFile(filename, content, message, authorName) {
    const authorEmail = `${authorName}@gitforge.local`;
    const env = {
      GIT_AUTHOR_NAME: authorName,
      GIT_AUTHOR_EMAIL: authorEmail,
      GIT_COMMITTER_NAME: authorName,
      GIT_COMMITTER_EMAIL: authorEmail
    };

    // Write blob
    const blobSha = execSync(`git hash-object -w --stdin`, {
      cwd: repoPath,
      input: content,
      env: { ...process.env, ...env }
    }).toString().trim();

    // Get current parent
    let parentCommit = null;
    let treeEntries = [];
    try {
      parentCommit = execSync(`git rev-parse refs/heads/main`, { cwd: repoPath, stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
      const treeContents = execSync(`git ls-tree refs/heads/main`, { cwd: repoPath }).toString().trim();
      treeEntries = treeContents.split('\n').filter(Boolean);
    } catch (e) {
      // First commit
    }

    // Update entries
    const updatedEntries = treeEntries.filter(entry => {
      const parts = entry.split(/\s+/);
      return parts[3] !== filename;
    });
    updatedEntries.push(`100644 blob ${blobSha}\t${filename}`);

    // Create tree
    const newTreeSha = execSync(`git mktree`, {
      cwd: repoPath,
      input: updatedEntries.join('\n') + '\n',
      env: { ...process.env, ...env }
    }).toString().trim();

    // Create commit
    const commitArgs = ['commit-tree', newTreeSha];
    if (parentCommit) {
      commitArgs.push('-p', parentCommit);
    }
    commitArgs.push('-m', message);

    const newCommitSha = execFileSync('git', commitArgs, {
      cwd: repoPath,
      env: { ...process.env, ...env }
    }).toString().trim();

    // Update ref
    execFileSync('git', ['update-ref', 'refs/heads/main', newCommitSha], { cwd: repoPath });
    console.log(`Committed: ${filename} - "${message}" (commit: ${newCommitSha.substring(0, 7)})`);
  }

  // Seed 5 pages
  // Page 1: Home
  commitFile('Home.md', `# Wiki Home\nWelcome to the discussions-repo wiki!\n\nUse the sidebar to explore topics like [[Getting Started]] or check out the [[API Reference]].`, 'Initial Home commit', 'appi');
  
  // Page 2: Getting Started
  commitFile('Getting-Started.md', `# Getting Started\nThis page helps you get started with the codebase.\n\nSee [[API Reference]] for endpoint details.`, 'Create Getting Started', 'appi');

  // Page 3: API Reference
  commitFile('API-Reference.md', `# API Reference\nDetailed endpoint specifications are listed here.`, 'Create API Reference', 'appi');

  // Page 4: Coding Style
  commitFile('Coding-Style.md', `# Coding Style\nWe follow standard ESLint rules.`, 'Create Coding Style', 'appi');

  // Page 5: Deployments
  commitFile('Deployments.md', `# Deployments\nProduction is managed via Docker.`, 'Create Deployments', 'appi');

  // Add 2 more edits to Getting Started to make it 3 edits total
  commitFile('Getting-Started.md', `# Getting Started\nThis page helps you get started with the codebase.\n\nUpdate: added prerequisites section.\n\nSee [[API Reference]] for endpoint details.`, 'Add prerequisites description', 'testowner');
  commitFile('Getting-Started.md', `# Getting Started\nThis page helps you get started with the codebase.\n\nPrerequisites:\n- Node.js v20\n- PostgreSQL\n\nSee [[API Reference]] for endpoint details.`, 'Add detailed prerequisites checklist', 'testauthor');

  console.log('Wiki Seeding Phase 18 completed successfully!');
}

seedWiki().catch(console.error);

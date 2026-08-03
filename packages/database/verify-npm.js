const { prisma } = require('@gitforge/database');
const { NpmRegistryService } = require('../../backend/dist/services/package/npm-registry.service');

async function runTests() {
  console.log("Running Phase 24 NPM Registry End-to-End Verification Tests...");

  const storageMock = {
    uploaded: {},
    async uploadFile(bucket, key, data) {
      this.uploaded[`${bucket}/${key}`] = data;
      return { url: `/uploads/${bucket}/${key}` };
    },
    async downloadFile(bucket, key) {
      return this.uploaded[`${bucket}/${key}`] || null;
    }
  };

  const npmService = new NpmRegistryService(storageMock);

  // Load seeded user & repo
  const appi = await prisma.user.findFirst({ where: { username: "appi" } });
  const repo = await prisma.repository.findFirst({ where: { name: "projects-test-repo" } });

  const recordResult = (num, name, status, evidence) => {
    console.log(`Test ${num}: [${status}] - ${name} | Evidence: ${evidence}`);
  };

  // Clear package entries
  await prisma.packageVersion.deleteMany({});
  await prisma.package.deleteMany({});

  // 1. Simulating npm publish payload
  try {
    const mockTarballBase64 = Buffer.from("mock-tarball-archive-contents").toString("base64");
    const publishPayload = {
      name: "test-npm-package",
      "dist-tags": { latest: "1.2.3" },
      versions: {
        "1.2.3": {
          name: "test-npm-package",
          version: "1.2.3"
        }
      },
      _attachments: {
        "test-npm-package-1.2.3.tgz": {
          content_type: "application/octet-stream",
          data: mockTarballBase64,
          length: mockTarballBase64.length
        }
      }
    };

    const result = await npmService.publishPackage(appi.username, repo.name, "test-npm-package", publishPayload);
    
    // Check DB
    const pkg = await prisma.package.findFirst({
      where: { repositoryId: repo.id, name: "test-npm-package" },
      include: { versions: true }
    });

    if (result.ok && pkg && pkg.versions.length === 1 && pkg.versions[0].version === "1.2.3") {
      recordResult(1, "NPM Publish Tarball Extraction & DB Mapping", "PASS", `Created package version: ${pkg.versions[0].version} Size: ${pkg.versions[0].sizeBytes} bytes`);
    } else {
      recordResult(1, "NPM Publish Tarball Extraction & DB Mapping", "FAIL", "Failed to save package records");
    }
  } catch (e) {
    recordResult(1, "NPM Publish Tarball Extraction & DB Mapping", "FAIL", e.message);
  }

  // 2. Simulating npm install metadata check
  try {
    const metadata = await npmService.getPackageMetadata(appi.username, repo.name, "test-npm-package", "localhost:3001");
    const distTags = metadata["dist-tags"];
    const versionDoc = metadata.versions["1.2.3"];

    const isNameOk = metadata.name === "test-npm-package";
    const isTagOk = distTags.latest === "1.2.3";
    const isTarballOk = versionDoc.dist.tarball.includes("/packages/appi/projects-test-repo/npm/test-npm-package/-/test-npm-package-1.2.3.tgz");

    if (isNameOk && isTagOk && isTarballOk) {
      recordResult(2, "NPM Install Metadata Shape Compliance", "PASS", `Metadata tags: ${JSON.stringify(distTags)} Tarball URL: ${versionDoc.dist.tarball}`);
    } else {
      recordResult(2, "NPM Install Metadata Shape Compliance", "FAIL", `Metadata returned: ${JSON.stringify(metadata)}`);
    }
  } catch (e) {
    recordResult(2, "NPM Install Metadata Shape Compliance", "FAIL", e.message);
  }

  // 3. Simulating downloading tarball file stream
  try {
    const buffer = await npmService.downloadTarball(appi.username, repo.name, "test-npm-package", "test-npm-package-1.2.3.tgz");
    const content = buffer.toString();

    if (content === "mock-tarball-archive-contents") {
      recordResult(3, "NPM Tarball Streaming Download Integrity", "PASS", `Downloaded tarball decoded: "${content}"`);
    } else {
      recordResult(3, "NPM Tarball Streaming Download Integrity", "FAIL", `Content mismatch: ${content}`);
    }
  } catch (e) {
    recordResult(3, "NPM Tarball Streaming Download Integrity", "FAIL", e.message);
  }

  console.log("\nNPM Registry E2E Tests Completed.");
}

runTests();

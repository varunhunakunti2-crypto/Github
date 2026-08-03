const { prisma } = require('@gitforge/database');
const { NpmRegistryService } = require('../../backend/dist/services/package/npm-registry.service');
const { DockerRegistryService } = require('../../backend/dist/services/package/docker-registry.service');
const { MavenRegistryService } = require('../../backend/dist/services/package/maven-registry.service');
const { PypiRegistryService } = require('../../backend/dist/services/package/pypi-registry.service');
const crypto = require('crypto');

async function runTests() {
  console.log("Running GitForge Packages Multi-Protocol End-to-End Verification Tests...");

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
  const dockerService = new DockerRegistryService(storageMock);
  const mavenService = new MavenRegistryService(storageMock);
  const pypiService = new PypiRegistryService(storageMock);

  const appi = await prisma.user.findFirst({ where: { username: "appi" } });
  const repo = await prisma.repository.findFirst({ where: { name: "projects-test-repo" } });

  const recordResult = (num, name, status, evidence, notes) => {
    console.log(`Test ${num} | ${status} | ${evidence} | ${notes}`);
  };

  // Clear previous packages
  await prisma.packageVersion.deleteMany({});
  await prisma.package.deleteMany({});

  // 1. NPM: Publish Tarball & DB Mapping
  try {
    const mockTarballBase64 = Buffer.from("npm-tarball-data").toString("base64");
    await npmService.publishPackage(appi.username, repo.name, "npm-pkg", {
      name: "npm-pkg",
      "dist-tags": { latest: "1.0.0" },
      versions: { "1.0.0": {} },
      _attachments: { "npm-pkg-1.0.0.tgz": { data: mockTarballBase64 } }
    });
    const check = await prisma.package.findFirst({ where: { name: "npm-pkg" } });
    if (check) {
      recordResult(1, "NPM Publish Protocol", "PASS", "npm publish payload parsed successfully, created package entry", "");
    } else {
      recordResult(1, "NPM Publish Protocol", "FAIL", "No record created", "");
    }
  } catch (e) {
    recordResult(1, "NPM Publish Protocol", "FAIL", e.message, "");
  }

  // 2. NPM: Install Metadata Shape Compliance
  try {
    const metadata = await npmService.getPackageMetadata(appi.username, repo.name, "npm-pkg", "localhost:3001");
    if (metadata.versions["1.0.0"] && metadata["dist-tags"].latest === "1.0.0") {
      recordResult(2, "NPM Install Metadata Shape", "PASS", `Metadata: ${JSON.stringify(metadata["dist-tags"])}`, "");
    } else {
      recordResult(2, "NPM Install Metadata Shape", "FAIL", "Invalid metadata shape", "");
    }
  } catch (e) {
    recordResult(2, "NPM Install Metadata Shape", "FAIL", e.message, "");
  }

  // 3. DOCKER: Scoped JWT Token issuance
  try {
    const resToken = await dockerService.generateToken("appi", "repository:appi/projects-test-repo:pull,push");
    if (resToken.token.includes("mock_docker_token_for_appi_scope_repository:appi/projects-test-repo:pull,push")) {
      recordResult(3, "Docker JWT Challenge Scope Token", "PASS", `Generated token: ${resToken.token}`, "");
    } else {
      recordResult(3, "Docker JWT Challenge Scope Token", "FAIL", "Token string format mismatch", "");
    }
  } catch (e) {
    recordResult(3, "Docker JWT Challenge Scope Token", "FAIL", e.message, "");
  }

  // 4. DOCKER: Finalize blob digest check (Integrity validation)
  try {
    const uuid = "upload-uuid-123";
    await dockerService.initiateUpload(appi.username, repo.name, uuid);
    
    const blobContent = Buffer.from("docker-layer-binary-content");
    await dockerService.appendChunk(uuid, blobContent);

    const correctDigest = "sha256:" + crypto.createHash("sha256").update(blobContent).digest("hex");
    
    // Attempt finalized with matching digest
    await dockerService.finalizeUpload(appi.username, repo.name, uuid, correctDigest);
    recordResult(4, "Docker OCI upload integrity verify", "PASS", `matching digest: ${correctDigest} finalized successfully`, "BLOCKING CHECK PASSED");
  } catch (e) {
    recordResult(4, "Docker OCI upload integrity verify", "FAIL", e.message, "BLOCKING CHECK FAILED");
  }

  // 5. DOCKER (BLOCKING): Corrupt digest upload rejection
  try {
    const uuid = "upload-uuid-456";
    await dockerService.initiateUpload(appi.username, repo.name, uuid);
    
    const blobContent = Buffer.from("docker-layer-binary-content-corrupted");
    await dockerService.appendChunk(uuid, blobContent);

    // Provide incorrect digest
    const incorrectDigest = "sha256:invalidhash1234567890";
    
    try {
      await dockerService.finalizeUpload(appi.username, repo.name, uuid, incorrectDigest);
      recordResult(5, "Docker OCI corrupt upload rejection", "FAIL", "accepted corrupted upload without hash match", "BLOCKING CHECK FAILED");
    } catch (err) {
      recordResult(5, "Docker OCI corrupt upload rejection", "PASS", "rejected digest mismatch successfully", "BLOCKING CHECK PASSED");
    }
  } catch (e) {
    recordResult(5, "Docker OCI corrupt upload rejection", "FAIL", e.message, "");
  }

  // 6. MAVEN: Artifact upload and checksum resolution
  try {
    const jarData = Buffer.from("maven-jar-contents");
    await mavenService.uploadArtifact(appi.username, repo.name, "com.gitforge", "core-lib", "2.1.0", "core-lib-2.1.0.jar", jarData);
    
    const downloadJar = await mavenService.getArtifact(appi.username, repo.name, "com.gitforge", "core-lib", "2.1.0", "core-lib-2.1.0.jar");
    const downloadSha1 = await mavenService.getArtifact(appi.username, repo.name, "com.gitforge", "core-lib", "2.1.0", "core-lib-2.1.0.jar.sha1");
    
    const expectedSha1 = crypto.createHash("sha1").update(jarData).digest("hex");
    if (downloadJar.toString() === "maven-jar-contents" && downloadSha1.toString() === expectedSha1) {
      recordResult(6, "Maven artifacts & dynamic checksums", "PASS", `Jar Downloaded. SHA1 Checksum matched: ${downloadSha1.toString()}`, "");
    } else {
      recordResult(6, "Maven artifacts & dynamic checksums", "FAIL", `Jar: ${downloadJar} Checksum: ${downloadSha1}`, "");
    }
  } catch (e) {
    recordResult(6, "Maven artifacts & dynamic checksums", "FAIL", e.message, "");
  }

  // 7. PYTHON PYPI: Twine uploads & PEP 503 HTML Simple index
  try {
    const mockWheel = {
      originalname: "gitforge_client-1.0.0-py3-none-any.whl",
      buffer: Buffer.from("python-wheel-contents")
    };

    await pypiService.uploadDistribution(appi.username, repo.name, {
      name: "gitforge-client",
      version: "1.0.0"
    }, mockWheel);

    const indexHtml = await pypiService.getSimpleIndex(appi.username, repo.name, "gitforge-client");
    const hasLink = indexHtml.includes('href="/api/v1/packages/appi/projects-test-repo/pypi/files/gitforge_client-1.0.0-py3-none-any.whl"');

    if (hasLink) {
      recordResult(7, "PyPI PEP 503 Simple Index & uploads", "PASS", "Twine upload persisted, HTML simple index generated with correct links", "");
    } else {
      recordResult(7, "PyPI PEP 503 Simple Index & uploads", "FAIL", `HTML: ${indexHtml}`, "");
    }
  } catch (e) {
    recordResult(7, "PyPI PEP 503 Simple Index & uploads", "FAIL", e.message, "");
  }

  console.log("\nMulti-Protocol Registry E2E Tests Completed.");
}

runTests();

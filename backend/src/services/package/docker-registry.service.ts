import { Injectable, NotFoundException, ConflictException, ForbiddenException } from "@nestjs/common";
import { prisma } from "@gitforge/database";
import { StorageService } from "../storage/storage.service";
import * as crypto from "crypto";

@Injectable()
export class DockerRegistryService {
  // UUID to active upload byte buffers map for chunked uploads
  private uploads = new Map<string, { buffer: Buffer; owner: string; repo: string }>();

  constructor(private readonly storageService: StorageService) {}

  // Generate short lived token for Docker challenge auth
  async generateToken(username: string, scope: string) {
    // Return a mock token that contains the scope permissions
    // Format: mock_docker_token_for_<username>_scope_<scope>
    return {
      token: `mock_docker_token_for_${username}_scope_${scope}`,
      expires_in: 3600,
      issued_at: new Date().toISOString()
    };
  }

  // Parse token from header and check scope access
  async verifyTokenScope(authHeader: string, requiredRepo: string, requiredAction: string) {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ForbiddenException("Missing bearer token");
    }
    const token = authHeader.substring(7);
    if (!token.startsWith("mock_docker_token_for_")) {
      throw new ForbiddenException("Invalid token format");
    }

    const parts = token.replace("mock_docker_token_for_", "").split("_scope_");
    const username = parts[0];
    const scopeStr = parts[1] || ""; // e.g. "repository:owner/repo:pull,push"
    
    // Check if scope permits action
    const match = scopeStr.match(/repository:([^:]+):(.+)/);
    if (!match) {
      throw new ForbiddenException("Invalid token scope");
    }

    const repoPath = match[1]; // "owner/repo"
    const actions = match[2].split(","); // ["pull", "push"]

    if (repoPath !== requiredRepo || !actions.includes(requiredAction)) {
      throw new ForbiddenException("Token scope does not permit action");
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      throw new ForbiddenException("User not found");
    }

    return user;
  }

  // Initiate blob upload session
  async initiateUpload(owner: string, repo: string, uuid: string) {
    this.uploads.set(uuid, { buffer: Buffer.alloc(0), owner, repo });
    return uuid;
  }

  // Upload chunk / append bytes
  async appendChunk(uuid: string, chunk: Buffer) {
    const session = this.uploads.get(uuid);
    if (!session) {
      throw new NotFoundException("Upload session not found");
    }
    session.buffer = Buffer.concat([session.buffer, chunk]);
  }

  // Finalize blob upload and check SHA256 digest
  async finalizeUpload(owner: string, repo: string, uuid: string, digest: string) {
    const session = this.uploads.get(uuid);
    if (!session) {
      throw new NotFoundException("Upload session not found");
    }

    const fileBuffer = session.buffer;
    
    // Verify sha256 digest integrity
    const computed = "sha256:" + crypto.createHash("sha256").update(fileBuffer).digest("hex");
    if (computed !== digest) {
      throw new ConflictException(`Digest mismatch. Claimed: ${digest}, Computed: ${computed}`);
    }

    // Save blob to Storage
    const storageKey = `blobs/${digest.replace("sha256:", "")}`;
    await this.storageService.uploadFile("docker", storageKey, fileBuffer);
    
    // Cleanup upload session
    this.uploads.delete(uuid);
  }

  // Retrieve OCI manifest
  async getManifest(owner: string, repo: string, imageName: string, reference: string) {
    const repository = await prisma.repository.findFirst({
      where: { name: repo, owner: { username: owner } }
    });
    if (!repository) {
      throw new NotFoundException("Repository not found");
    }

    const pkg = await prisma.package.findFirst({
      where: { repositoryId: repository.id, name: imageName, packageType: "DOCKER" }
    });
    if (!pkg) {
      throw new NotFoundException("Image not found");
    }

    const version = await prisma.packageVersion.findFirst({
      where: { packageId: pkg.id, version: reference }
    });
    if (!version) {
      throw new NotFoundException("Manifest tag/digest not found");
    }

    const fileContent = await this.storageService.downloadFile("docker", version.fileUrl);
    if (!fileContent) {
      throw new NotFoundException("Manifest content not found");
    }

    return JSON.parse(fileContent.toString());
  }

  // Publish OCI Manifest
  async putManifest(owner: string, repo: string, imageName: string, reference: string, manifestJson: any) {
    const repository = await prisma.repository.findFirst({
      where: { name: repo, owner: { username: owner } }
    });
    if (!repository) {
      throw new NotFoundException("Repository not found");
    }

    let pkg = await prisma.package.findFirst({
      where: { repositoryId: repository.id, name: imageName, packageType: "DOCKER" }
    });
    if (!pkg) {
      pkg = await prisma.package.create({
        data: {
          name: imageName,
          packageType: "DOCKER",
          repositoryId: repository.id
        }
      });
    }

    const manifestBuffer = Buffer.from(JSON.stringify(manifestJson));
    const digest = "sha256:" + crypto.createHash("sha256").update(manifestBuffer).digest("hex");
    const storageKey = `manifests/${digest.replace("sha256:", "")}`;

    // Upload manifest file
    await this.storageService.uploadFile("docker", storageKey, manifestBuffer);

    // Save manifest version
    await prisma.packageVersion.upsert({
      where: { packageId_version: { packageId: pkg.id, version: reference } },
      update: { fileUrl: storageKey, sizeBytes: manifestBuffer.length },
      create: {
        packageId: pkg.id,
        version: reference,
        fileUrl: storageKey,
        sizeBytes: manifestBuffer.length
      }
    });

    // Also record the digest version
    await prisma.packageVersion.upsert({
      where: { packageId_version: { packageId: pkg.id, version: digest } },
      update: { fileUrl: storageKey, sizeBytes: manifestBuffer.length },
      create: {
        packageId: pkg.id,
        version: digest,
        fileUrl: storageKey,
        sizeBytes: manifestBuffer.length
      }
    });

    return digest;
  }

  // Retrieve OCI blob
  async downloadBlob(digest: string): Promise<Buffer> {
    const storageKey = `blobs/${digest.replace("sha256:", "")}`;
    const buffer = await this.storageService.downloadFile("docker", storageKey);
    if (!buffer) {
      throw new NotFoundException("Blob not found");
    }
    return buffer;
  }
}

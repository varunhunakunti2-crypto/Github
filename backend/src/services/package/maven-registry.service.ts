import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@gitforge/database";
import { StorageService } from "../storage/storage.service";
import * as crypto from "crypto";

@Injectable()
export class MavenRegistryService {
  constructor(private readonly storageService: StorageService) {}

  // Handle uploading Maven artifact file
  async uploadArtifact(
    owner: string,
    repo: string,
    groupId: string,
    artifactId: string,
    version: string,
    filename: string,
    fileBuffer: Buffer
  ) {
    const repository = await prisma.repository.findFirst({
      where: { name: repo, owner: { username: owner } }
    });
    if (!repository) {
      throw new NotFoundException("Repository not found");
    }

    const packageKey = `${groupId}:${artifactId}`;
    let pkg = await prisma.package.findFirst({
      where: { repositoryId: repository.id, name: packageKey, packageType: "MAVEN" }
    });
    if (!pkg) {
      pkg = await prisma.package.create({
        data: {
          name: packageKey,
          packageType: "MAVEN",
          repositoryId: repository.id
        }
      });
    }

    // Storage key includes layout path
    const storageKey = `maven/${groupId.replace(/\./g, "/")}/${artifactId}/${version}/${filename}`;
    await this.storageService.uploadFile("maven", storageKey, fileBuffer);

    // Save package version record if it's a jar/pom file
    if (filename.endsWith(".jar") || filename.endsWith(".pom")) {
      await prisma.packageVersion.upsert({
        where: { packageId_version: { packageId: pkg.id, version } },
        update: { fileUrl: storageKey, sizeBytes: fileBuffer.length },
        create: {
          packageId: pkg.id,
          version,
          fileUrl: storageKey,
          sizeBytes: fileBuffer.length
        }
      });
    }

    return { ok: true };
  }

  // Retrieve Maven artifact file
  async getArtifact(
    owner: string,
    repo: string,
    groupId: string,
    artifactId: string,
    version: string,
    filename: string
  ): Promise<Buffer> {
    const repository = await prisma.repository.findFirst({
      where: { name: repo, owner: { username: owner } }
    });
    if (!repository) {
      throw new NotFoundException("Repository not found");
    }

    const storageKey = `maven/${groupId.replace(/\./g, "/")}/${artifactId}/${version}/${filename}`;
    const buffer = await this.storageService.downloadFile("maven", storageKey);

    if (!buffer) {
      // If the file is a checksum file (.md5 or .sha1) and it doesn't exist, we can compute it on the fly!
      const isMd5 = filename.endsWith(".md5");
      const isSha1 = filename.endsWith(".sha1");
      if (isMd5 || isSha1) {
        const baseFilename = filename.replace(/\.(md5|sha1)$/, "");
        const baseKey = `maven/${groupId.replace(/\./g, "/")}/${artifactId}/${version}/${baseFilename}`;
        const baseBuffer = await this.storageService.downloadFile("maven", baseKey);
        
        if (baseBuffer) {
          const hashType = isMd5 ? "md5" : "sha1";
          const checksumHex = crypto.createHash(hashType).update(baseBuffer).digest("hex");
          return Buffer.from(checksumHex);
        }
      }
      throw new NotFoundException("Artifact file not found");
    }

    return buffer;
  }
}

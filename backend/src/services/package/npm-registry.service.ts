import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { prisma } from "@gitforge/database";
import { StorageService } from "../storage/storage.service";
import * as crypto from "crypto";

@Injectable()
export class NpmRegistryService {
  constructor(private readonly storageService: StorageService) {}

  // Parse and return package metadata document required by npm CLI
  async getPackageMetadata(owner: string, repo: string, packageName: string, host: string) {
    const repository = await prisma.repository.findFirst({
      where: { name: repo, owner: { username: owner } }
    });
    if (!repository) {
      throw new NotFoundException("Repository not found");
    }

    const pkg = await prisma.package.findFirst({
      where: { repositoryId: repository.id, name: packageName, packageType: "NPM" },
      include: { versions: { orderBy: { publishedAt: "desc" } } }
    });

    if (!pkg || pkg.versions.length === 0) {
      throw new NotFoundException("Package not found");
    }

    const latestVersion = pkg.versions[0].version;

    const versionsMetadata: any = {};
    for (const v of pkg.versions) {
      versionsMetadata[v.version] = {
        name: pkg.name,
        version: v.version,
        dist: {
          tarball: `http://${host}/api/v1/packages/${owner}/${repo}/npm/${pkg.name}/-/${pkg.name}-${v.version}.tgz`,
          shasum: crypto.createHash("sha1").update(v.version).digest("hex") // mock shasum for npm client validation
        }
      };
    }

    return {
      _id: pkg.name,
      name: pkg.name,
      "dist-tags": {
        latest: latestVersion
      },
      versions: versionsMetadata
    };
  }

  // Handle npm publish PUT payload
  async publishPackage(owner: string, repo: string, packageName: string, body: any) {
    const repository = await prisma.repository.findFirst({
      where: { name: repo, owner: { username: owner } }
    });
    if (!repository) {
      throw new NotFoundException("Repository not found");
    }

    // npm publish payload embeds the tarball inside _attachments mapping
    const attachments = body._attachments;
    if (!attachments) {
      throw new ConflictException("Missing attachments in publish payload");
    }

    const filename = Object.keys(attachments)[0];
    const attachment = attachments[filename];
    const tarballBuffer = Buffer.from(attachment.data, "base64");

    // Extract version metadata
    const distTags = body["dist-tags"] || {};
    const version = distTags.latest || Object.keys(body.versions)[0];
    if (!version) {
      throw new ConflictException("No version specified in publish payload");
    }

    // Ensure Package record exists
    let pkg = await prisma.package.findFirst({
      where: { repositoryId: repository.id, name: packageName, packageType: "NPM" }
    });
    if (!pkg) {
      pkg = await prisma.package.create({
        data: {
          name: packageName,
          packageType: "NPM",
          repositoryId: repository.id
        }
      });
    }

    // Check if version already exists
    const existingVersion = await prisma.packageVersion.findFirst({
      where: { packageId: pkg.id, version }
    });
    if (existingVersion) {
      throw new ConflictException(`Version ${version} already exists`);
    }

    // Upload tarball via StorageService
    const storageKey = `${packageName}-${version}.tgz`;
    await this.storageService.uploadFile("npm", storageKey, tarballBuffer);

    // Record PackageVersion row
    const pkgVersion = await prisma.packageVersion.create({
      data: {
        packageId: pkg.id,
        version,
        fileUrl: storageKey,
        sizeBytes: tarballBuffer.length
      }
    });

    return { ok: true, version: pkgVersion.version };
  }

  // Retrieve actual tarball stream
  async downloadTarball(owner: string, repo: string, packageName: string, tarballName: string): Promise<Buffer> {
    const repository = await prisma.repository.findFirst({
      where: { name: repo, owner: { username: owner } }
    });
    if (!repository) {
      throw new NotFoundException("Repository not found");
    }

    const pkg = await prisma.package.findFirst({
      where: { repositoryId: repository.id, name: packageName, packageType: "NPM" }
    });
    if (!pkg) {
      throw new NotFoundException("Package not found");
    }

    // Resolve key from tarballName
    const buffer = await this.storageService.downloadFile("npm", tarballName);
    if (!buffer) {
      throw new NotFoundException("Tarball not found");
    }

    return buffer;
  }
}

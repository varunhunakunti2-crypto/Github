import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { prisma } from "@gitforge/database";
import { StorageService } from "../storage/storage.service";

@Injectable()
export class PypiRegistryService {
  constructor(private readonly storageService: StorageService) {}

  // Serves PEP 503 compliant Simple Repository HTML index
  async getSimpleIndex(owner: string, repo: string, packageName: string) {
    const repository = await prisma.repository.findFirst({
      where: { name: repo, owner: { username: owner } }
    });
    if (!repository) {
      throw new NotFoundException("Repository not found");
    }

    const pkg = await prisma.package.findFirst({
      where: { repositoryId: repository.id, name: packageName, packageType: "PYPI" },
      include: { versions: true }
    });

    if (!pkg) {
      throw new NotFoundException("Package not found");
    }

    // Generate compliant simple HTML response
    let html = `<!DOCTYPE html><html><head><title>Links for ${packageName}</title></head><body><h1>Links for ${packageName}</h1>`;
    for (const v of pkg.versions) {
      const filename = v.fileUrl.split("/").pop(); // extract original uploaded filename
      html += `<a href="/api/v1/packages/${owner}/${repo}/pypi/files/${filename}">${filename}</a><br/>`;
    }
    html += `</body></html>`;
    return html;
  }

  // Handle upload of distribution package via Twine
  async uploadDistribution(owner: string, repo: string, body: any, file: Express.Multer.File) {
    const repository = await prisma.repository.findFirst({
      where: { name: repo, owner: { username: owner } }
    });
    if (!repository) {
      throw new NotFoundException("Repository not found");
    }

    const packageName = body.name;
    const version = body.version;
    if (!packageName || !version) {
      throw new ConflictException("Missing name or version in twine payload");
    }

    let pkg = await prisma.package.findFirst({
      where: { repositoryId: repository.id, name: packageName, packageType: "PYPI" }
    });
    if (!pkg) {
      pkg = await prisma.package.create({
        data: {
          name: packageName,
          packageType: "PYPI",
          repositoryId: repository.id
        }
      });
    }

    // Save actual wheel/tarball file
    const storageKey = `pypi/${file.originalname}`;
    await this.storageService.uploadFile("pypi", storageKey, file.buffer);

    // Save package version record
    await prisma.packageVersion.upsert({
      where: { packageId_version: { packageId: pkg.id, version } },
      update: { fileUrl: storageKey, sizeBytes: file.buffer.length },
      create: {
        packageId: pkg.id,
        version,
        fileUrl: storageKey,
        sizeBytes: file.buffer.length
      }
    });

    return { ok: true };
  }

  // Download python distribution archive
  async downloadFile(owner: string, repo: string, filename: string): Promise<Buffer> {
    const repository = await prisma.repository.findFirst({
      where: { name: repo, owner: { username: owner } }
    });
    if (!repository) {
      throw new NotFoundException("Repository not found");
    }

    const storageKey = `pypi/${filename}`;
    const buffer = await this.storageService.downloadFile("pypi", storageKey);
    if (!buffer) {
      throw new NotFoundException("Distribution file not found");
    }
    return buffer;
  }
}

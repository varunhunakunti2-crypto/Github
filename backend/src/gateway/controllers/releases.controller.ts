import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { Response } from "express";
import { ReleaseService } from "../../services/repository/release.service";
import { prisma } from "@gitforge/database";
import * as path from "path";
import * as fs from "fs";

// Setup storage folder and multer diskStorage engine for memory-safe uploads
const uploadDir = path.resolve(process.cwd(), 'git-daemon', 'data', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

@Controller("repositories/:owner/:repo/releases")
export class ReleasesController {
  constructor(private readonly releaseService: ReleaseService) {}

  @Get()
  listReleases(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Query("username") username?: string
  ) {
    return this.releaseService.listReleases(owner, repo, username);
  }

  @Get("id/:id")
  findOne(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("id") id: string,
    @Query("username") username?: string
  ) {
    return this.releaseService.findOne(owner, repo, id, username);
  }

  @Get("tag/:tag")
  findByTag(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("tag") tag: string,
    @Query("username") username?: string
  ) {
    return this.releaseService.findByTag(owner, repo, tag, username);
  }

  @Post()
  createRelease(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Body() dto: any
  ) {
    const username = dto.username || 'appi';
    return this.releaseService.createRelease(owner, repo, username, dto);
  }

  @Patch(":id")
  updateRelease(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("id") id: string,
    @Body() dto: any
  ) {
    const username = dto.username || 'appi';
    return this.releaseService.updateRelease(owner, repo, id, username, dto);
  }

  @Delete(":id")
  deleteRelease(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("id") id: string,
    @Body() dto: any
  ) {
    const username = dto.username || 'appi';
    const deleteTag = dto.deleteTag === true;
    return this.releaseService.deleteRelease(owner, repo, id, username, deleteTag);
  }

  @Post("notes")
  autoGenerateNotes(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Body() dto: any
  ) {
    const username = dto.username || 'appi';
    return this.releaseService.autoGenerateNotes(owner, repo, dto.tagName, username);
  }

  // Upload an asset file safely streaming directly to disk (500MB size limit)
  @Post(":id/assets")
  @UseInterceptors(FileInterceptor("file", {
    storage: multerStorage,
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB
  }))
  async uploadAsset(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("id") id: string,
    @Query("username") username: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException("No file uploaded or file exceeds 500MB limit");
    }
    const user = username || 'appi';
    return this.releaseService.addAsset(owner, repo, id, user, file);
  }

  @Delete("assets/:assetId")
  deleteAsset(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("assetId") assetId: string,
    @Body() dto: any
  ) {
    const username = dto.username || 'appi';
    return this.releaseService.deleteAsset(owner, repo, assetId, username);
  }

  // Download release binary file (gated by repository access control)
  @Get("assets/download/:filename")
  async downloadAsset(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("filename") filename: string,
    @Query("username") username: string,
    @Res() res: Response
  ) {
    // 1. Verify read access first
    const repository = await prisma.repository.findFirst({
      where: { name: repo, owner: { username: owner } }
    });
    if (!repository) throw new NotFoundException("Repository not found");
    if (repository.isPrivate) {
      if (!username) throw new NotFoundException("Repository not found");
      const isOwner = repository.ownerId === username || owner === username;
      if (!isOwner) throw new NotFoundException("Repository not found");
    }

    const filePath = path.join(uploadDir, filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException("Asset file not found");
    }

    // 2. Increment download count in DB
    const asset = await prisma.releaseAsset.findFirst({
      where: { fileUrl: { contains: filename } }
    });
    if (asset) {
      await prisma.releaseAsset.update({
        where: { id: asset.id },
        data: { downloadCount: { increment: 1 } }
      });
    }

    // 3. Stream file directly to client
    res.setHeader("Content-Disposition", `attachment; filename="${asset?.fileName || filename}"`);
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  // Download auto-generated source code archive (zip or tar.gz)
  @Get("archive/:tag")
  async downloadArchive(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("tag") tag: string,
    @Query("format") format: string,
    @Query("username") username: string,
    @Res() res: Response
  ) {
    const archiveFormat = format === "zip" ? "zip" : "tar.gz";
    const filename = `${repo}-${tag}.${archiveFormat === "zip" ? "zip" : "tar.gz"}`;

    const { stream, stderr } = await this.releaseService.getArchiveStream(
      owner,
      repo,
      tag,
      archiveFormat,
      username
    );

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", archiveFormat === "zip" ? "application/zip" : "application/gzip");

    stream.pipe(res);
  }
}

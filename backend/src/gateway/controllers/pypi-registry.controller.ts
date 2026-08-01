import { Controller, Get, Post, Param, Body, Res, UseGuards, UseInterceptors, UploadedFile, HttpStatus } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { PypiRegistryService } from "../../services/package/pypi-registry.service";
import { AuthGuard } from "../../common/guards/auth.guard";
import { Response } from "express";

@Controller("packages")
export class PypiRegistryController {
  constructor(private readonly pypiService: PypiRegistryService) {}

  @Get(":owner/:repo/pypi/simple/:packageName")
  async getSimpleIndex(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("packageName") packageName: string,
    @Res() res: Response
  ) {
    const html = await this.pypiService.getSimpleIndex(owner, repo, packageName);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(HttpStatus.OK).send(html);
  }

  @Get(":owner/:repo/pypi/files/:filename")
  async downloadFile(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("filename") filename: string,
    @Res() res: Response
  ) {
    const buffer = await this.pypiService.downloadFile(owner, repo, filename);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Length", buffer.length.toString());
    return res.status(HttpStatus.OK).send(buffer);
  }

  @Post(":owner/:repo/pypi")
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor("content"))
  async upload(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.pypiService.uploadDistribution(owner, repo, body, file);
  }
}

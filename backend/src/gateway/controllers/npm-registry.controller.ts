import { Controller, Get, Put, Param, Body, Headers, Res, Req, UseGuards } from "@nestjs/common";
import { NpmRegistryService } from "../../services/package/npm-registry.service";
import { AuthGuard } from "../../common/guards/auth.guard";
import { Response, Request } from "express";

@Controller("packages")
export class NpmRegistryController {
  constructor(private readonly npmRegistryService: NpmRegistryService) {}

  @Get(":owner/:repo/npm/:packageName")
  async getMetadata(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("packageName") packageName: string,
    @Headers("host") host: string
  ) {
    return this.npmRegistryService.getPackageMetadata(owner, repo, packageName, host);
  }

  @Get(":owner/:repo/npm/:packageName/-/:tarballName")
  async downloadTarball(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("packageName") packageName: string,
    @Param("tarballName") tarballName: string,
    @Res() res: Response
  ) {
    const buffer = await this.npmRegistryService.downloadTarball(owner, repo, packageName, tarballName);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Length", buffer.length.toString());
    res.send(buffer);
  }

  @Put(":owner/:repo/npm/:packageName")
  @UseGuards(AuthGuard)
  async publish(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("packageName") packageName: string,
    @Body() body: any
  ) {
    return this.npmRegistryService.publishPackage(owner, repo, packageName, body);
  }
}

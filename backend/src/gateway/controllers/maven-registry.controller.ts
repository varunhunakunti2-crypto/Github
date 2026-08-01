import { Controller, Get, Put, Param, Res, Req, UseGuards, HttpStatus } from "@nestjs/common";
import { MavenRegistryService } from "../../services/package/maven-registry.service";
import { AuthGuard } from "../../common/guards/auth.guard";
import { Response, Request } from "express";

@Controller("packages")
export class MavenRegistryController {
  constructor(private readonly mavenService: MavenRegistryService) {}

  @Put(":owner/:repo/maven/*")
  @UseGuards(AuthGuard)
  async upload(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const mavenPath = req.url.split("/maven/")[1];
    const parts = mavenPath.split("?")[0].split("/");
    
    const filename = parts.pop();
    const version = parts.pop();
    const artifactId = parts.pop();
    const groupId = parts.join(".");

    if (!filename || !version || !artifactId || !groupId) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: "Invalid Maven path structure" });
    }

    const chunks: Buffer[] = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", async () => {
      const buffer = Buffer.concat(chunks);
      await this.mavenService.uploadArtifact(owner, repo, groupId, artifactId, version, filename, buffer);
      return res.status(HttpStatus.CREATED).json({ ok: true });
    });
  }

  @Get(":owner/:repo/maven/*")
  async download(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const mavenPath = req.url.split("/maven/")[1];
    const parts = mavenPath.split("?")[0].split("/");

    const filename = parts.pop();
    const version = parts.pop();
    const artifactId = parts.pop();
    const groupId = parts.join(".");

    if (!filename || !version || !artifactId || !groupId) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: "Invalid Maven path structure" });
    }

    const buffer = await this.mavenService.getArtifact(owner, repo, groupId, artifactId, version, filename);
    
    // Set matching maven content types
    if (filename.endsWith(".jar")) res.setHeader("Content-Type", "application/java-archive");
    else if (filename.endsWith(".xml") || filename.endsWith(".pom")) res.setHeader("Content-Type", "application/xml");
    else res.setHeader("Content-Type", "text/plain");

    res.setHeader("Content-Length", buffer.length.toString());
    return res.status(HttpStatus.OK).send(buffer);
  }
}

import { Controller, Get, Put, Post, Patch, Head, Param, Body, Query, Headers, Res, Req, UseGuards, HttpStatus } from "@nestjs/common";
import { DockerRegistryService } from "../../services/package/docker-registry.service";
import { AuthGuard } from "../../common/guards/auth.guard";
import { Response, Request } from "express";
import * as crypto from "crypto";

@Controller("v2")
export class DockerRegistryController {
  constructor(private readonly dockerService: DockerRegistryService) {}

  // OCI V2 check API - challenge basic token auth if missing
  @Get()
  async checkV2(@Headers("authorization") auth: string, @Res() res: Response) {
    if (!auth) {
      res.setHeader("WWW-Authenticate", 'Bearer realm="http://localhost:3001/api/v1/v2/token",service="docker-registry"');
      return res.status(HttpStatus.UNAUTHORIZED).json({ errors: [{ code: "UNAUTHORIZED", message: "authentication required" }] });
    }
    
    res.setHeader("Docker-Distribution-Api-Version", "registry/2.0");
    return res.status(HttpStatus.OK).send();
  }

  // Token endpoint scoped for challenges
  @Get("token")
  async getToken(
    @Query("account") account: string,
    @Query("service") service: string,
    @Query("scope") scope: string
  ) {
    // Return token scoped to repo actions
    return this.dockerService.generateToken(account || "appi", scope || "");
  }

  // Manifests Pull
  @Get(":owner/:repo/manifests/:reference")
  async getManifest(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("reference") reference: string,
    @Headers("authorization") auth: string,
    @Res() res: Response
  ) {
    await this.dockerService.verifyTokenScope(auth, `${owner}/${repo}`, "pull");
    const manifest = await this.dockerService.getManifest(owner, repo, "image", reference);
    
    res.setHeader("Content-Type", "application/vnd.docker.distribution.manifest.v2+json");
    return res.status(HttpStatus.OK).json(manifest);
  }

  // Manifests Push
  @Put(":owner/:repo/manifests/:reference")
  async putManifest(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("reference") reference: string,
    @Headers("authorization") auth: string,
    @Body() manifestJson: any,
    @Res() res: Response
  ) {
    await this.dockerService.verifyTokenScope(auth, `${owner}/${repo}`, "push");
    const digest = await this.dockerService.putManifest(owner, repo, "image", reference, manifestJson);
    
    res.setHeader("Docker-Content-Digest", digest);
    res.setHeader("Location", `/v2/${owner}/${repo}/manifests/${reference}`);
    return res.status(HttpStatus.CREATED).send();
  }

  // Blobs Pull
  @Get(":owner/:repo/blobs/:digest")
  async getBlob(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("digest") digest: string,
    @Headers("authorization") auth: string,
    @Res() res: Response
  ) {
    await this.dockerService.verifyTokenScope(auth, `${owner}/${repo}`, "pull");
    const buffer = await this.dockerService.downloadBlob(digest);
    
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Length", buffer.length.toString());
    return res.status(HttpStatus.OK).send(buffer);
  }

  @Head(":owner/:repo/blobs/:digest")
  async checkBlob(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("digest") digest: string,
    @Headers("authorization") auth: string,
    @Res() res: Response
  ) {
    await this.dockerService.verifyTokenScope(auth, `${owner}/${repo}`, "pull");
    const buffer = await this.dockerService.downloadBlob(digest);
    
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Length", buffer.length.toString());
    res.setHeader("Docker-Content-Digest", digest);
    return res.status(HttpStatus.OK).send();
  }

  // Upload Blobs Initiate
  @Post(":owner/:repo/blobs/uploads")
  async initiateUpload(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Headers("authorization") auth: string,
    @Res() res: Response
  ) {
    await this.dockerService.verifyTokenScope(auth, `${owner}/${repo}`, "push");
    
    const uuid = crypto.randomUUID();
    await this.dockerService.initiateUpload(owner, repo, uuid);

    res.setHeader("Location", `/v2/${owner}/${repo}/blobs/uploads/${uuid}`);
    res.setHeader("Range", "0-0");
    return res.status(HttpStatus.ACCEPTED).send();
  }

  // Upload chunk
  @Patch(":owner/:repo/blobs/uploads/:uuid")
  async appendChunk(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("uuid") uuid: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    // Read raw request buffer stream
    const chunks: Buffer[] = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", async () => {
      const buffer = Buffer.concat(chunks);
      await this.dockerService.appendChunk(uuid, buffer);
      
      res.setHeader("Location", `/v2/${owner}/${repo}/blobs/uploads/${uuid}`);
      res.setHeader("Range", `0-${buffer.length}`);
      return res.status(HttpStatus.ACCEPTED).send();
    });
  }

  // Finalize Upload
  @Put(":owner/:repo/blobs/uploads/:uuid")
  async finalizeUpload(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Param("uuid") uuid: string,
    @Query("digest") digest: string,
    @Res() res: Response
  ) {
    await this.dockerService.finalizeUpload(owner, repo, uuid, digest);
    
    res.setHeader("Docker-Content-Digest", digest);
    return res.status(HttpStatus.CREATED).send();
  }
}

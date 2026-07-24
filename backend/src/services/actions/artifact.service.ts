import { Injectable } from "@nestjs/common";

@Injectable()
export class ArtifactService {
  async listArtifacts(runId: string) { return []; }
  async downloadArtifact(artifactId: string) { return null; }
}

import { Injectable } from "@nestjs/common";

@Injectable()
export class SecretService {
  async listSecrets(repoId: string) { return []; }
  async createSecret(repoId: string, dto: any) { return { message: "secret-created" }; }
  async deleteSecret(secretId: string) { return { message: "secret-deleted" }; }
}

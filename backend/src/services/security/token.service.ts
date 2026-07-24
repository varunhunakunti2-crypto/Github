import { Injectable } from "@nestjs/common";

@Injectable()
export class TokenService {
  async list() { return []; }
  async create(dto: any) { return { message: "token-created" }; }
  async revoke(id: string) { return { message: "token-revoked" }; }
}

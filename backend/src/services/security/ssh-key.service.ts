import { Injectable } from "@nestjs/common";

@Injectable()
export class SshKeyService {
  async list() { return []; }
  async add(dto: any) { return { message: "key-added" }; }
  async remove(id: string) { return { message: "key-removed" }; }
}

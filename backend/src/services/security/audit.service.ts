import { Injectable } from "@nestjs/common";

@Injectable()
export class AuditService {
  async log(action: string, actorId: string, targetType: string, targetId: string) { return { message: "logged" }; }
  async getOrgLog(orgSlug: string) { return []; }
}

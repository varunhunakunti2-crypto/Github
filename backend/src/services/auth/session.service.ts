import { Injectable } from "@nestjs/common";

@Injectable()
export class SessionService {
  async createSession(userId: string) { return { message: "session-created" }; }
  async destroySession(sessionId: string) { return { message: "session-destroyed" }; }
  async listSessions(userId: string) { return []; }
}

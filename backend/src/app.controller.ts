import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get("status")
  getStatus() {
    return {
      status: "healthy",
      service: "GitForge API",
      timestamp: new Date().toISOString(),
    };
  }
}

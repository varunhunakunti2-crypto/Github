import { Controller, Get, HttpStatus, HttpCode } from "@nestjs/common";
import { prisma } from "@gitforge/database";

@Controller("health")
export class HealthController {
  @Get()
  @HttpCode(HttpStatus.OK)
  async getHealth() {
    try {
      // Execute a quick database check
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: "UP",
        checks: {
          database: "UP",
        }
      };
    } catch (e: any) {
      return {
        status: "DOWN",
        checks: {
          database: "DOWN",
        },
        error: e.message
      };
    }
  }
}

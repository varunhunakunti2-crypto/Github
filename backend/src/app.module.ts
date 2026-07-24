import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { GatewayModule } from "./gateway/gateway.module";

@Module({
  imports: [GatewayModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}

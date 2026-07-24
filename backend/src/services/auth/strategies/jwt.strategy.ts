import { Injectable } from "@nestjs/common";

@Injectable()
export class JwtStrategy {
  validate(payload: any) { return payload; }
}

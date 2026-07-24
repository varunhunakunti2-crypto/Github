import { Injectable } from "@nestjs/common";

@Injectable()
export class LocalStrategy {
  validate(username: string, password: string) { return null; }
}

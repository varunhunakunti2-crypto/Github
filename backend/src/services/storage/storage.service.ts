import { Injectable } from "@nestjs/common";

@Injectable()
export class StorageService {
  async uploadFile(bucket: string, key: string, data: Buffer) { return { url: "" }; }
  async downloadFile(bucket: string, key: string) { return null; }
  async deleteFile(bucket: string, key: string) { return { message: "deleted" }; }
}

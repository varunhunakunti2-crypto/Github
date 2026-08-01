import { Injectable } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class StorageService {
  private readonly storageDir = path.resolve(process.cwd(), "uploads");

  constructor() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  async uploadFile(bucket: string, key: string, data: Buffer) {
    const bucketDir = path.join(this.storageDir, bucket);
    const filePath = path.join(bucketDir, key);

    if (!fs.existsSync(bucketDir)) {
      fs.mkdirSync(bucketDir, { recursive: true });
    }

    fs.writeFileSync(filePath, data);
    return { url: `/uploads/${bucket}/${key}` };
  }

  async downloadFile(bucket: string, key: string): Promise<Buffer | null> {
    const filePath = path.join(this.storageDir, bucket, key);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return fs.readFileSync(filePath);
  }

  async deleteFile(bucket: string, key: string) {
    const filePath = path.join(this.storageDir, bucket, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { message: "deleted" };
  }
}

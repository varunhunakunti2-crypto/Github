import { Injectable } from "@nestjs/common";

@Injectable()
export class SearchService {
  async search(query: string, type: string) { return { query, type, results: [] }; }
}

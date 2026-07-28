import { Injectable } from "@nestjs/common";

@Injectable()
export class BranchService {
  async list(owner: string, repo: string) {
    const res = await fetch(`http://localhost:3002/api/v1/repos/${owner}/${repo}/branches`);
    return await res.json();
  }
  
  async create(owner: string, repo: string, dto: any) {
    const res = await fetch(`http://localhost:3002/api/v1/repos/${owner}/${repo}/branches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer mock_bypass_token' },
      body: JSON.stringify(dto)
    });
    if (!res.ok) throw new Error('Failed to create branch');
    return await res.json();
  }
  
  async remove(owner: string, repo: string, branch: string) {
    const res = await fetch(`http://localhost:3002/api/v1/repos/${owner}/${repo}/branches/${branch}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer mock_bypass_token' }
    });
    if (!res.ok) throw new Error('Failed to delete branch');
    return await res.json();
  }
}

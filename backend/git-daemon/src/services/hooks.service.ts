import { Injectable } from '@nestjs/common';
import * as http from 'http';

@Injectable()
export class HooksService {
  /**
   * Called by the internal git update / post-receive hook when a push occurs.
   * This triggers background indexing and webhook dispatch.
   */
  async triggerPostReceive(owner: string, repo: string, refName: string, oldSha: string, newSha: string) {
    console.log(`[HOOKS] Received post-receive for ${owner}/${repo} on ${refName}`);
    
    // 1. Background Indexing (Triggering Search Engine update)
    this.queueBackgroundIndexing(owner, repo, newSha);

    // 2. Activity Generation (Feed update)
    this.generateActivityEvent(owner, repo, 'push', newSha);

    // 3. Webhook Dispatch
    this.dispatchWebhooks(owner, repo, refName, oldSha, newSha);
  }

  private queueBackgroundIndexing(owner: string, repo: string, newSha: string) {
    // In a real implementation, this pushes a job to BullMQ/Redis
    console.log(`[INDEXER] Queueing index job for ${owner}/${repo} at ${newSha}`);
  }

  private generateActivityEvent(owner: string, repo: string, action: string, ref: string) {
    // In a real implementation, writes an 'Activity' record to PostgreSQL
    console.log(`[ACTIVITY] Generated '${action}' activity for ${owner}/${repo}`);
  }

  private async dispatchWebhooks(owner: string, repo: string, refName: string, oldSha: string, newSha: string) {
    // Mock querying the DB for registered webhooks for this repository
    const mockRegisteredWebhooks = [
      { id: 1, url: 'http://localhost:3005/webhook-receiver', secret: 'testsecret' }
    ];

    const payload = JSON.stringify({
      repository: `${owner}/${repo}`,
      ref: refName,
      before: oldSha,
      after: newSha,
      pusher: 'appi' // Ideally fetched from the auth context passed via git env vars
    });

    for (const hook of mockRegisteredWebhooks) {
      console.log(`[WEBHOOK] Dispatching push event to ${hook.url}`);
      // Send the actual HTTP request to the external service
      // (Implementation omitted for brevity, uses axios/fetch with crypto HMAC signing)
    }
  }
}

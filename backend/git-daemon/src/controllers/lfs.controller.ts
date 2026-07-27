import { Controller, Post, Param, Req, Res, Body, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export interface LfsBatchRequest {
  operation: 'upload' | 'download';
  transfers?: string[];
  ref?: { name: string };
  objects: {
    oid: string;
    size: number;
  }[];
}

@Controller()
export class LfsController {
  constructor(private readonly authService: AuthService) {}

  @Post(':owner/:repo.git/info/lfs/objects/batch')
  async batch(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: LfsBatchRequest
  ) {
    try {
      // 1. Verify Headers (LFS uses specific content type)
      const isLfs = req.headers['content-type'] === 'application/vnd.git-lfs+json';
      if (!isLfs) {
        return res.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).send('Unsupported Media Type');
      }

      // 2. Authorize
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.setHeader('LFS-Authenticate', 'Basic realm="GitForge LFS"');
        return res.status(HttpStatus.UNAUTHORIZED).send({ message: 'Credentials needed' });
      }

      const user = await this.authService.authenticateHeader(authHeader);
      
      const requiredAccess = body.operation === 'upload' ? 'write' : 'read';
      await this.authService.checkRepositoryPermission(user, owner, repo, requiredAccess);

      // 3. Process Objects and Generate Presigned URLs
      const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3000';
      const minioEndpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000/gitforge-lfs';
      
      const objects = body.objects.map(obj => {
        // In a real implementation, generate temporary S3 presigned URLs using AWS SDK
        const objectPath = `${owner}/${repo}/${obj.oid}`;
        const presignedUrl = `${minioEndpoint}/${objectPath}?mock_signature=12345`;

        if (body.operation === 'upload') {
          return {
            oid: obj.oid,
            size: obj.size,
            actions: {
              upload: {
                href: presignedUrl,
                header: { 'x-amz-acl': 'private' },
                expires_in: 3600
              }
            }
          };
        } else {
          return {
            oid: obj.oid,
            size: obj.size,
            actions: {
              download: {
                href: presignedUrl,
                expires_in: 3600
              }
            }
          };
        }
      });

      // 4. Return LFS Batch Response
      return res.status(200)
        .header('Content-Type', 'application/vnd.git-lfs+json')
        .send({
          transfer: 'basic',
          objects
        });

    } catch (err: any) {
      console.error('[LFS] Batch API Error:', err);
      const status = err.status || 500;
      if (!res.headersSent) {
        res.status(status).send({
          message: err.message || 'Internal Server Error'
        });
      }
    }
  }
}

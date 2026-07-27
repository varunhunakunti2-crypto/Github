export class CommitDto {
  hash: string;
  authorName: string;
  authorEmail: string;
  date: string;
  message: string;
  parents: string[];
  signatureStatus?: string;
}

export class BranchDto {
  name: string;
  hash: string;
}

export class FileNodeDto {
  mode: string;
  type: 'blob' | 'tree' | 'commit';
  hash: string;
  path: string;
  name: string;
  size?: number;
  lastCommitMessage?: string;
  lastCommitDate?: string;
  lastCommitHash?: string;
}

export class DiffHunkDto {
  header: string;
  lines: string[];
}

export class DiffFileDto {
  oldPath: string;
  newPath: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  hunks: DiffHunkDto[];
}

export class CreateBranchDto {
  name: string;
  fromRef: string;
}

export class CommitFileEntryDto {
  path: string;
  content: string;
  encoding?: 'base64' | 'utf-8';
}

export class CommitChangeDto {
  branch: string;
  message: string;
  files: CommitFileEntryDto[];
  expectedParentSha?: string; // Optimistic concurrency check
}

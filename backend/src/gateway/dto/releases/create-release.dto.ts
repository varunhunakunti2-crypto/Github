export class CreateReleaseDto {
  tag_name: string;
  target_commit_sha: string;
  title: string;
  body_markdown?: string;
  is_prerelease?: boolean;
  is_draft?: boolean;
}

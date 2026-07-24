export class CreatePullDto {
  title: string;
  body?: string;
  source_branch: string;
  target_branch: string;
  is_draft?: boolean;
}

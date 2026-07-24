export class CreateIssueDto {
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
  milestone_id?: string;
}

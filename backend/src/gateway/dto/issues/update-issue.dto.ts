export class UpdateIssueDto {
  title?: string;
  body?: string;
  state?: string;
  labels?: string[];
  assignees?: string[];
  milestone_id?: string;
}

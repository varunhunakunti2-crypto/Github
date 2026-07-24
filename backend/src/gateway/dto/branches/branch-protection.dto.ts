export class BranchProtectionDto {
  require_pr?: boolean;
  required_approvals?: number;
  require_status_checks?: boolean;
  require_signed_commits?: boolean;
}

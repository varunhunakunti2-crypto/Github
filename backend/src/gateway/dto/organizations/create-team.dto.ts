export class CreateTeamDto {
  name: string;
  slug: string;
  privacy?: string;
  parent_team_id?: string;
}

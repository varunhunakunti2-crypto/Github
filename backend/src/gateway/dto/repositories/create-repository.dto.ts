export class CreateRepositoryDto {
  name: string;
  description?: string;
  visibility?: string;
  default_branch?: string;
  license?: string;
}

/**
 * Validates a branch name against Git's ref-naming rules.
 * Returns an error string if invalid, or null if valid.
 */
export function validateBranchName(name: string): string | null {
  if (!name) return 'Branch name cannot be empty';
  if (name.startsWith('.')) return 'Branch name cannot start with a dot (.)';
  if (name.endsWith('/')) return 'Branch name cannot end with a slash (/)';
  if (name.includes('..')) return 'Branch name cannot contain consecutive dots (..)';
  if (name.includes('//')) return 'Branch name cannot contain consecutive slashes (//)';
  if (name.endsWith('.lock')) return 'Branch name cannot end with .lock';
  if (name.includes('@{')) return 'Branch name cannot contain "@{';
  
  // Forbidden characters
  const forbidden = /[\s\x00-\x1F\x7F~^:?*\[\\]/;
  if (forbidden.test(name)) {
    return 'Branch name cannot contain spaces, backslashes, or control/special characters (~, ^, :, ?, *, [, etc.)';
  }
  
  return null; // Valid
}
